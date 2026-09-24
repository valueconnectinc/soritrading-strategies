/*
 * @coinsori-strategy v1
 * name: BTC Regime Trend StrongBullHold 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Variant of the validated regime-trend champion that lets winners
 * run in strong uptrends. When price is well above its 50-day average (strong bull),
 * the small-chop hysteresis exit is skipped so a pullback inside a real uptrend does
 * not sell us out before the trend resumes. Only a deep crash stop exits in that state.
 * When it buys and sells: Buy when the last closed price is above the 50-day average.
 * Sell when price drops 2.5 ATRs below the average (crash), or, when NOT strongly above
 * the average, when it closes 1 ATR below it (normal chop exit).
 * When it does NOT work: In a strong bull that then rolls over hard, the bull-hold
 * skips the early exit and can ride a bigger drawdown before the crash stop fires.
 * Long-only, so it does not profit from shorting bear markets.
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
  // Strong bull: price far above the average -> skip the chop exit, only crash-stop.
  const strongBull = px > sma50 + 1.5 * atr;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

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

  // In a strong bull, only the crash stop exits; otherwise use the normal chop exit.
  const shouldExit = strongBull ? crashStop : (exitBelow || crashStop);
  if (shouldExit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
