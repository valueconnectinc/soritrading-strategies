/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion RegimeHold 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend recipe with a targeted fix for its
 * known weakness: in a strong bull market it used to exit on normal pullbacks and
 * the 2021-2022 window underperformed. The fix checks the regime BEFORE the pullback:
 * if the market was in a strong bull (price far above its 50-day and above its 200-day)
 * a few bars ago, the current dip is treated as bull noise and the strategy holds
 * through the small hysteresis exit; it only exits when the trend has actually turned
 * (hysteresis exit with no recent strong bull) or on a deep crash stop.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or fear is extreme. Sell on the hysteresis exit
 * (1 ATR below the 50-day) unless the market was in a strong bull regime a few bars
 * ago, in which case hold; the deep crash stop (2.5 ATR below) always exits.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit can whipsaw; and it still rides full drawdowns in grind-downs
 * that never make a new high (MDD can reach ~60%). It is long-only, so it does not
 * profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 210) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // REGIME BEFORE THE PULLBACK: was the market in a strong bull a few bars ago?
  // Check 5 bars back so the signal reflects the established trend, not the current
  // dip (which by definition has already fallen near/below the 50-day). If the trend
  // was strong recently, treat the current dip as bull noise and hold through it.
  const px5 = closes[closes.length - 2 - 5];
  const sma50_5 = ctx.sma(50, 6);
  const sma200_5 = ctx.sma(200, 6);
  const atr5 = ctx.atr(14, 6);
  let strongBullRecent = false;
  if (px5 != null && sma50_5 != null && sma200_5 != null && atr5 != null && atr5 > 0) {
    strongBullRecent = px5 > sma200_5 && (px5 - sma50_5) >= 1.5 * atr5;
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

  // Hold through the small hysteresis exit if the regime was strong bull recently;
  // the deep crash stop always exits.
  const shouldExit = crashStop || (exitBelow && !strongBullRecent);
  if (shouldExit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
