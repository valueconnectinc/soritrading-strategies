/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends persist for weeks-to-months, so riding price above
 * its moving average captures most of the upside while a hysteresis exit and a crash
 * stop cut the worst drawdowns. This is the same recipe validated on daily bars for
 * BTC/ETH/SOL/BNB/ADA/XRP; here we test whether the edge survives on 4-hour bars,
 * a faster cadence with noisier signals.
 * When it buys and sells: Buy when the last closed price is above the 50-bar average,
 * sized down when volatility is high or fear is extreme (<=20). Sell when price closes
 * 1 ATR below the average (ignore small chop), or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit can whipsaw; it rides full drawdowns in grind-downs that never
 * make a new high. Long-only, so it does not profit from shorting bear markets.
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
