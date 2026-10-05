/*
 * @coinsori-strategy v1
 * name: SOL 1D Defensive Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Defensive mean-reversion — buy a sharp drop to the lower
 * Bollinger band while the daily trend is still up, ride the snap-back to the
 * 20-day average. The rising-200d gate keeps it out of bear markets; RSI + a
 * price-extension limit stop it from buying dips that are still wildly above
 * the long-term mean after a huge rally.
 * When it buys and sells: buys when SOL touches the lower Bollinger band AND
 * RSI < 35 AND its 200-day average is rising, price is above it, and price is
 * not more than 1.6x that average (so the dip is not a late-extension buy).
 * Sells when price recovers above the 20-day EMA or drops below the 200-day
 * average (trend broken).
 * When it does NOT work: in a sustained bear market the rising-200d gate keeps
 * it in cash (misses bounces); it underperforms buy-and-hold in melt-up windows
 * because it exits at the 20-day EMA instead of riding the full trend.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200_20ago = ctx.sma(200, 21);
  const ema20 = ctx.ema(20, 1);
  if (bb == null || rsi == null || sma200 == null || sma200_20ago == null || ema20 == null) return null;

  const lower = Array.isArray(bb) ? bb[2] : bb.lower;
  if (!Number.isFinite(lower)) return null;

  ctx.watch([
    { side: 'buy', price: lower, note: 'BB lower band' },
    { side: 'sell', price: ema20, note: 'recovery to EMA20' }
  ]);

  const pos = ctx.position;
  if (pos > 0) {
    // Exit on recovery to EMA20, or if the long-term trend broke (price below 200d avg)
    if (price >= ema20 || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const trendRising = sma200 >= sma200_20ago;
  // Extension filter 1.6x: W2 (2023-25 melt-up) losses came from buying dips still ~2-3x above the 200d mean; cap the buy zone.
  const notExtended = price <= 1.6 * sma200;
  if (price <= lower && rsi < 35 && price > sma200 && trendRising && notExtended) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
