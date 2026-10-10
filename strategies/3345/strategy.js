/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index measures crowd emotion. Extreme fear marks capitulation and usually a local bottom; buying the first turn out of extreme fear catches the sentiment bounce.
 * When it buys and sells: Buys when the index is in extreme fear (<25) and starts rising from the day before. Sells when the index turns greedy (>70), after 10 days, or on a 10% stop.
 * When it does NOT work: In a grinding bear market the index can stay in fear for months and bounces are weak or negative — the stop and time limit cap but cannot prevent losses. No sentiment data before Feb 2018 means no trades before then.
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
    // Extreme fear (<25) that turns up vs the day before = capitulation fading.
    // Using closed previous values only, so the signal is known before the bar opens.
    if (prevPrev != null && prev < 25 && prev > prevPrev) {
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
