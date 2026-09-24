/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Tight Hysteresis 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Variant of the validated champion (2388) that tightens the
 * hysteresis exit from 1.0 ATR to 0.5 ATR below the 50-day average. The champion's
 * ~60% MDD comes from the slow hysteresis exit in grind-downs (the crash stop is
 * redundant). Hypothesis: exiting sooner on a weak trend cuts drawdown at the cost
 * of a few more whipsaw trades.
 * When it buys and sells: Buy when closed price is above the 50-day average.
 * Sell when price closes 0.5 ATR below the average, or 2.5 ATRs below in a crash.
 * When it does NOT work: In choppy ranges near the average a tighter exit whipsaws
 * more often, adding fees and selling the bottom of minor dips.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 0.5 * atr; // TIGHTENED hysteresis from 1.0 to 0.5 ATR
  const crashStop = px < sma50 - 2.5 * atr;

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

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
