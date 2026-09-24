/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Two-Tier Slope 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A long-only trend strategy wins when markets end below their peak
 * (crash avoidance) but bleeds in a bear-then-recovery window where it keeps buying
 * bounces above a falling average. This variant uses the 50-day-average slope as a
 * two-tier gate: full size when the average is rising, 0.7 size when it is flat, and a
 * HARD BLOCK when the average is clearly falling. That keeps full participation in a
 * clean bull, still catches a choppy recovery, and refuses to buy into a confirmed
 * bear — cutting the worst whipsaw losses.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized by the average's slope (full/0.7/blocked). Sell when price closes 1 ATR below
 * the average (ignore small chop), or drops 2.5 ATRs below it in a crash. Extra sizing
 * cut in high volatility and extreme fear.
 * When it does NOT work: The hard block on a falling average can delay re-entry at the
 * very start of a V-shaped recovery, so it may miss the first leg of a sharp rebound.
 * It is long-only and does not profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50Prev = ctx.sma(50, 11); // ~10 bars earlier, to gauge slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50Prev == null || atr == null || px <= 0) return null;

  const slope = (sma50 - sma50Prev) / sma50Prev; // relative 10-bar slope of the average
  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // Two-tier slope gate: block when clearly falling, reduce when flat.
  let slopeMult = 1;
  if (slope < -0.01) {
    slopeMult = 0; // hard block: average is falling >1% over 10 bars
  } else if (slope < 0) {
    slopeMult = 0.7; // flat: average drifting down slightly, enter smaller
  }

  // Volatility-scaled sizing: compare today's ATR/price to its 50-bar average.
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }
  sizeMult *= slopeMult;

  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    if (long && slopeMult > 0 && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
