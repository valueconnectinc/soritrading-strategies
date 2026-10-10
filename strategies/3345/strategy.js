/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index measures crowd emotion. Extreme fear inside an uptrend marks a panic that is usually bought back; buying the first turn out of extreme fear catches that bounce.
 * When it buys and sells: Buys when the index is in extreme fear (<25), turns up from the day before, and price is above the 200-day average (uptrend only). Sells when the index turns greedy (>70), after 10 days, or on a 10% stop.
 * When it does NOT work: It stays in cash for most of a strong bull (fear is rare), so it underperforms buy-and-hold there. No sentiment data before Feb 2018 means no trades before then.
 */

function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');       // today's sentiment index
  if (fg == null) return null;             // sentiment data not available yet
  const st = ctx.state;
  const prev = st.fgPrev;                  // yesterday's closed index
  st.fgPrev = fg;                          // store today for the next bar
  if (prev == null) return null;           // need a closed value before acting

  const price = ctx.price;

  if (ctx.position <= 0) {
    const prevPrev = st.fgPrevPrev;        // value from two bars ago
    const trend = ctx.sma(200, 1);         // closed 200-day average
    // Extreme fear (<25) that turns up, but ONLY inside an uptrend:
    // in a downtrend extreme fear is often the start of the fall, not its end.
    if (prevPrev != null && trend != null && prev < 25 && prev > prevPrev && price > trend) {
      st.entryBar = ctx.i;
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    st.fgPrevPrev = prev;
    return null;
  }

  const entry = ctx.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  st.fgPrevPrev = prev;
  // Exit on euphoria (greed), a 10-day time limit, or a 10% hard stop
  if (fg > 70 || barsHeld >= 10 || price <= entry * 0.9) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
