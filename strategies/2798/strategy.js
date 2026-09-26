/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Funds Gate + Trend-Scaled Size
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same monetary-policy signal as the pure fed gate — hold
 * Bitcoin while the fed funds rate is not aggressively rising, go to cash in
 * a hiking cycle. The difference: instead of riding full drawdowns whenever
 * the Fed is on hold, it cuts position size to half when price is below its
 * 200-day average. The policy gate still decides whether to be in or out;
 * the trend only decides HOW MUCH to hold. This is a gentle de-risking that
 * avoids the all-or-nothing whipsaw of a full price-trend exit.
 * When it buys and sells: it is fully invested (98%) when the fed funds
 * rate is not rising AND price is above its 200-day average; half invested
 * when the rate is not rising but price is below the 200-day (a bear within
 * a neutral policy period); and flat when the Fed is actively hiking.
 * When it does NOT work: if the Fed stays on hold through a long crypto
 * bear (like 2019 or 2025), the half-size position still loses money; and
 * a melt-up that starts while price is still below the 200-day is only
 * captured at half size.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fedNow = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  if (fedNow == null || fedLag == null) return null;

  // Tightening = current rate meaningfully above its level ~30 rows ago.
  const tightening = fedNow > fedLag + 0.5;

  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);

  if (pos > 0 && tightening) {
    return { side: 'sell', qty: pos };
  }

  // Not tightening: decide target size. Full above the 200-day, half below.
  // The 200-day is a slow trend line, so this adds few trades (no churn).
  const target = (sma200 != null && price > sma200) ? 0.98 : 0.5;
  const targetQty = ctx.cash / price * target;

  if (pos === 0) {
    if (!tightening) return { side: 'buy', qty: targetQty };
    return null;
  }

  // Position exists: adjust toward target (buy more if under, sell if over).
  if (targetQty > pos * 1.02) {
    return { side: 'buy', qty: targetQty - pos };
  }
  if (pos > targetQty * 1.02) {
    return { side: 'sell', qty: pos - targetQty };
  }
  return null;
}
