/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend + Vol & Fear Sizing 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The same regime-trend recipe that was validated as a champion on
 * SOL 1D — ride the 50-day average trend, size down when volatility spikes or the crowd
 * is in extreme fear, and bail out of crashes early. Reusing it on ETH to diversify a
 * second major liquid asset.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when ATR/price is high or fear index is extreme. Sell when price closes
 * 1 ATR below the average (ignore small chop), or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit whipsaws; and it still rides full drawdowns in grind-downs that
 * never make a new high.
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
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // Volatility-scaled sizing: compare today's ATR/price to its 50-bar average.
  // More volatile than normal -> cut exposure, clamp [0.3,1].
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

  // Fear & greed risk filter: extreme fear (<=20) usually means mid-crash. Cut to 40%.
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
