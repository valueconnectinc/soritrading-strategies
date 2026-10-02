/*
 * @coinsori-strategy v1
 * name: SOL 1D Defensive MR Volume-Confirmed (1.5x)
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sensitivity check on the volume threshold. The 1.3x volume filter
 * improved the champion's full-span return (+45 vs +35) and fixed the recent bear loss.
 * This raises the threshold to 1.5x to confirm the improvement is not overfit to 1.3x —
 * if 1.5x keeps the improvement (or a large part of it), the volume-confirmation axis is
 * robust and not a single-point tuning artifact.
 * When it buys and sells: buy when price closes below the lower Bollinger (20,2) with
 * RSI(14)<30 AND current volume is above 1.5x its 20-day average, inside a rising 200-day
 * average. Sell when price closes back above the 20-day EMA or the 200-day trend turns down.
 * When it does NOT work: in a broad coordinated bear the rising-trend gate keeps it flat;
 * a stricter volume filter can miss quiet capitulations; in a melt-up it lags buy-and-hold.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || avgVol == null || vol == null) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.position;

  if (pos > 0) {
    if (price > ema20 || !uptrend) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const flush = price < bb.lower && rsi < 30;
  const realVolume = vol > 1.5 * avgVol; // stricter volume gate for sensitivity check
  if (flush && realVolume) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
