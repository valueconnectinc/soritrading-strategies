/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the validated regime-trend recipe that beat buy-and-hold
 * on ETH, BTC, SOL and BNB across disjoint windows (no parameter tuning). The bet:
 * crypto trends persist for months, so riding price above its 50-day average captures
 * most of the upside, while a hysteresis exit (1 ATR below the average) and a crash
 * stop cut the worst drawdowns. Sizing down in high volatility and extreme fear
 * protects capital without missing the bull.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when ATR/price is high or the fear index is extreme (<=20). Sell when
 * price closes 1 ATR below the average (ignore small chop), or drops 2.5 ATRs below
 * it in a crash.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit can whipsaw; and it still rides full drawdowns in grind-downs
 * that never make a new high (MDD can reach ~60%). It is a long-only trend strategy,
 * so it does not profit from shorting bear markets.
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
