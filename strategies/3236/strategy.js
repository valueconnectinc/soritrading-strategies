/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Wide Trailing Stop
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 90-day momentum + 200-day average core is the validated
 * champion on BNB. A 30% trailing stop from the entry-peak (wider than the 25%
 * version) cuts the 2022 crash leg while avoiding the whipsaw that a tighter
 * stop caused on the 2018-2021 window. 30% is near the historical max daily
 * pullback BNB shows inside a bull trend before resuming.
 * When it buys and sells: buys when 90-day momentum is above +20% and price is
 * above the 200-day average. Sells when momentum fades below +5%, price breaks
 * the 200-day average, or price falls 30% below its peak since entry.
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
    st.hi = (st.hi == null || prevClose > st.hi) ? prevClose : st.hi;
    // 30% trailing stop: a BNB crash, not a normal pullback
    if (roc90 < 5 || prevClose < sma200 || prevClose < st.hi * 0.70) {
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
