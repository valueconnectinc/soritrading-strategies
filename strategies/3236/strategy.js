/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Trailing Stop
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 90-day momentum + 200-day average core is the validated
 * champion on BNB. Its known weakness is riding the 2022 bear down to the slow
 * momentum exit. A 25% trailing stop from the highest close since entry cuts that
 * crash leg without the whipsaw a fast moving-average exit causes (a 25% daily
 * drop is a rare crash signal for BNB, not a normal pullback).
 * When it buys and sells: buys when 90-day momentum is above +20% and price is
 * above the 200-day average. Sells when momentum fades below +5%, price breaks
 * the 200-day average, or price falls 25% below its peak since entry.
 * When it does NOT work: in a violent but recoverable crash the stop locks in a
 * loss and the strategy re-enters only after momentum recovers, missing the
 * rebound. Single-symbol means no diversification.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  const pos = ctx.position;
  const st = ctx.state;

  if (pos > 0) {
    // track the highest close since entry
    st.hi = (st.hi == null || prevClose > st.hi) ? prevClose : st.hi;
    // 25% trailing stop: a BNB daily crash, not a normal pullback
    if (roc90 < 5 || prevClose < sma200 || prevClose < st.hi * 0.75) {
      st.hi = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  st.hi = null;
  if (roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
