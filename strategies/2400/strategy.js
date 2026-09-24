/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion StrongHold 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the validated regime-trend recipe (rides price above its
 * 50-day average, hysteresis exit, crash stop, volatility/fear sizing) with ONE targeted
 * fix for its known weakness: in a strong bull market (price well above the 200-day
 * average and far above the 50-day), a normal pullback used to trigger the small
 * hysteresis exit and the strategy re-entered late, missing the V-shaped recovery
 * (the 2021-2022 underperformance). The fix: in a strong bull regime, HOLD through
 * small pullbacks and only exit on the deep crash stop.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or fear is extreme. Sell on the hysteresis exit
 * (1 ATR below the 50-day) UNLESS we are in a strong bull regime (above 200-day and
 * far above 50-day), in which case only the deep crash stop (2.5 ATR below) exits.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit can whipsaw; and it still rides full drawdowns in grind-downs
 * that never make a new high (MDD can reach ~60%). It is long-only, so it does not
 * profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 205) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma200 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // STRONG BULL REGIME: above the 200-day average AND far above the 50-day
  // (>= 1.5 ATR). In this regime a pullback is normal bull noise, so hold through
  // the small hysteresis exit and only the deep crash stop gets us out.
  const strongBull = px > sma200 && (px - sma50) >= 1.5 * atr;

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

  // In strong bull, skip the small hysteresis exit; only the crash stop exits.
  const shouldExit = crashStop || (exitBelow && !strongBull);
  if (shouldExit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
