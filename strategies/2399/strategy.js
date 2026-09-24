/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion v3 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Improvement on the validated regime-trend champion. The original
 * rode full drawdowns in grinding downtrends because its 1-ATR hysteresis exit whipsaws
 * when price hovers near a flat/declining 50-day average. An earlier attempt also
 * required a rising 50-day average to enter, but that missed strong bull runs that start
 * from a flat average. This version keeps the proven simple entry (price above the 50-day
 * average) and adds only the trend-break exit: leave when the 50-day average itself turns
 * down, which cuts grind-down drawdowns without blocking bull entries.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when ATR/price is high or fear is extreme. Sell when price closes 1 ATR
 * below the average, drops 2.5 ATRs below it, or the 50-day average itself starts falling.
 * When it does NOT work: In a choppy sideways market it can whipsaw around the average;
 * it is long-only so it does not profit from shorting bear markets. If a downtrend is so
 * gradual the average never clearly turns down, it can still ride a deep drawdown.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50prev = ctx.sma(50, 6); // SMA 5 bars earlier to check slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50prev == null || atr == null || px <= 0) return null;

  const long = px > sma50; // proven simple entry: price above the 50-day average
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early
  const trendBreak = sma50 < sma50prev; // the trend itself has turned down

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

  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (exitBelow || crashStop || trendBreak) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
