/*
 * @coinsori-strategy v1
 * name: BTC Panic Dip + Network Health 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A panic dip (2-period RSI below 10) inside an uptrend is usually bought back —
 * but only when the network is still growing. Active addresses above their 30-day average is the
 * fundamental confirmation that adoption supports the dip. When addresses are falling, the dip is
 * a warning, not an opportunity.
 * When it buys and sells: Buys when RSI(2) < 10 AND price above the 200-day average AND active
 * addresses above their 30-day average. Sells after 5 days, when RSI turns overbought, or on an
 * 8% stop. Same exits as the validated version, but fewer, better-grounded entries.
 * When it does NOT work: If active-address data is missing it does nothing. In a deep bear the
 * 8% stop still caps losses. It only trades ~a few times a year, so it is quiet by design.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed-bar RSI(2)
  const trend = ctx.sma(200, 1);    // closed-bar 200-day average
  const price = ctx.price;
  // on-chain network health from the user's connected DB (null if DB unreachable)
  const addr = ctx.data('addr');
  const addr30 = ctx.data('addr_sma30');
  if (rsi == null || trend == null || price == null || addr == null || addr30 == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // Panic dip + uptrend + growing network = the whole signal (fundamental gate, not a fitted hack)
    if (rsi < 10 && price > trend && addr > addr30) {
      st.entryBar = ctx.i;
      ctx.watch([{ side: 'sell', price: price * 0.92, trigger: 'below', note: '8% stop' }]);
      return { side: 'buy', qty: (ctx.cash / price) * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  const rsiNow = ctx.rsi(2, 0);
  ctx.watch([{ side: 'sell', price: entry * 0.92, trigger: 'below', note: '8% stop' }]);
  // Exit on stop, overbought, or a 5-day time limit (mean reversion decays fast)
  if (price <= entry * 0.92 || rsiNow > 70 || barsHeld >= 5) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
