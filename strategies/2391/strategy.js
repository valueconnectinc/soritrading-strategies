/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Tight Crash 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Variant of the validated champion (2388) that tightens the
 * crash stop from 2.5 ATR to 2.0 ATR below the 50-day average, aiming to cut the
 * honest ~60% MDD the champion reports. Same trend entry, vol-scaled sizing and
 * fear filter. Hypothesis to test: a tighter crash stop reduces drawdown without
 * giving up too much upside.
 * When it buys and sells: Buy when closed price is above the 50-day average.
 * Sell when price closes 1 ATR below the average (hysteresis), or drops 2.0 ATRs
 * below it in a crash.
 * When it does NOT work: In slow grinding downtrends near the average it whipsaws;
 * a tighter stop risks selling out of a normal dip that then recovers.
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
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.0 * atr; // TIGHTENED from 2.5 to 2.0 ATR

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
