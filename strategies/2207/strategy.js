/*
 * @coinsori-strategy v1
 * name: BTC Fed-Regime Trend ATR-Buffer 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the base Fed-regime filter (hold only when the Fed is not
 * hiking + 100-day trend guard) was promising defensively but whipsawed badly in
 * choppy bulls because a tiny dip below the 100-day average knocked it out. This
 * adds an ATR buffer around the average so small dips no longer trigger exits.
 * When it buys: Fed is not hiking AND price is above the 100-day average plus a
 * 1x ATR buffer (confirmed above, not just touching).
 * When it sells: price falls below the 100-day average minus a 1x ATR buffer, or
 * the Fed starts hiking.
 * When it does NOT work: in a raging bull the buffer makes entry slightly late and
 * it still trails buy-and-hold; in a sudden crash the buffer delays the exit by a
 * day so it takes a bigger initial hit.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed');
  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (fed == null || sma100 == null || atr == null || price == null || price <= 0) return null;

  // track fed history in state to detect a hiking cycle (rate up vs ~90 days ago)
  const fedHist = ctx.state.fedHist || [];
  fedHist.push(fed);
  if (fedHist.length > 400) fedHist.shift();
  ctx.state.fedHist = fedHist;
  const prev90 = fedHist.length >= 90 ? fedHist[fedHist.length - 90] : null;
  const hiking = prev90 != null && fed > prev90 * 1.01; // hiking cycle = clearly higher than 90d ago

  const equity = cash + pos * price;
  // ATR buffer (1x) so small dips don't whipsaw us out of a choppy bull
  const buf = atr;
  const above = price > sma100 + buf;
  const below = price < sma100 - buf;

  let targetQty;
  if (hiking) {
    targetQty = 0; // Fed hiking: stay out
  } else if (above) {
    targetQty = equity / price; // confirmed above trend: fully in
  } else if (below) {
    targetQty = 0; // confirmed below trend: out
  } else {
    targetQty = pos; // inside buffer: hold whatever we have (no churn)
  }

  const diff = targetQty - pos;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, pos)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(pos, -diff) };
  }
}
