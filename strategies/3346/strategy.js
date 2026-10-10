/*
 * @coinsori-strategy v1
 * name: BTC Drawdown-High MR 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Inside an uptrend, deep corrections (25%+ below the recent high) are usually bought back. Buying the correction and selling the recovery captures the mean-reversion bounce that the RSI2 trigger misses — slow grinding corrections, not just sharp multi-day crashes.
 * When it buys and sells: Buys when the previous close is at least 25% below its 200-day high while above the 200-day average. Sells when price recovers to within 10% of that high, after 5 days, or on an 8% stop.
 * When it does NOT work: If the correction keeps grinding lower (a real trend break), the stop and time limit cap but cannot prevent losses; in strong bulls there are few 25% corrections so it trades rarely.
 */

function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes.length < 3) return null;
  const prevClose = closes.at(-2);       // last CLOSED close (no lookahead)
  const high200 = ctx.high(200, 1);      // highest high of the last 200 closed bars
  const trend = ctx.sma(200, 1);         // closed 200-day average
  if (prevClose == null || high200 == null || trend == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // Deep correction (>=25% below the 200-day high) inside an uptrend
    if (prevClose <= high200 * 0.75 && prevClose > trend) {
      st.entryBar = ctx.i;
      st.high = high200;                 // freeze the recovery target
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || ctx.price;
  const highRef = st.high || high200;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  // Exit on recovery to within 10% of the high, a 5-day time limit, or an 8% hard stop
  if (ctx.price >= highRef * 0.9 || barsHeld >= 5 || ctx.price <= entry * 0.92) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
