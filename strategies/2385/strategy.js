/*
 * @coinsori-strategy v1
 * name: SOL Pure-Regime TightCrash 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The no-trail SOL variant beats buy-and-hold on all three windows
 * but still carries a 72% drawdown because it holds through deep crashes until price
 * falls 3 ATRs below the 50-day average. This variant tightens the crash stop to 2.5 ATRs
 * below the average to bail out of crashes sooner, trimming MDD while keeping the
 * no-trailing-stop structure that captured the parabolic upside.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or the crowd is in extreme fear. Sell when price
 * closes 1 ATR below the average, or drops 2.5 ATRs below it in a crash. No trailing stop.
 * When it does NOT work: Tightening the crash stop can exit a normal sharp dip that
 * instantly recovers, adding small whipsaw losses; and it still rides full drawdowns in
 * slow grind-downs that never make a new high.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // tighter than 3 to cut deep-crash MDD

  // Volatility-scaled sizing: normalized vol = ATR/price averaged over last 50 bars,
  // compared to today's ratio. More volatile than normal -> cut exposure, clamp [0.3,1].
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
