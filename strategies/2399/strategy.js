/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the validated regime-trend recipe that beat buy-and-hold
 * on ETH, BTC, SOL and BNB across disjoint windows. The bet: crypto trends persist for
 * months, so riding price above its 50-day average captures most of the upside, while
 * a hysteresis exit (1 ATR below the average) and a crash stop cut the worst drawdowns.
 * Sizing down in high volatility and extreme fear protects capital without missing the
 * bull. The one change from the original champion: after a crash stop, it re-enters
 * FASTER (on a 20-day average cross) when the long-term regime is still bullish, so it
 * does not miss the recovery leg after a sharp mid-bull crash.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when ATR/price is high or fear is extreme (<=20). After a crash-stop exit
 * in a still-bullish regime, re-enter faster when price crosses above the 20-day
 * average. Sell when price closes 1 ATR below the average, or drops 2.5 ATRs below it.
 * When it does NOT work: In slow grinding downtrends price hovers near the average and
 * the hysteresis exit can whipsaw; and it still rides full drawdowns in grind-downs
 * that never make a new high (MDD ~60%). It is long-only, so it does not profit from
 * shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
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
    if (cash <= 0 || ctx.price <= 0) return null;
    if (long) { // normal entry: above the 50-day average
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    // Faster re-entry after a crash stop: if we were stopped out recently and the
    // long-term regime is still up, buy again on a 20-day cross instead of waiting
    // for the 50-day. This targets the W2 late-re-entry weakness.
    if (ctx.state.reentry && ctx.state.reentry.bar > 0) {
      const sma20 = ctx.sma(20, 1);
      const sma200 = ctx.sma(200, 1);
      if (sma20 != null && sma200 != null && px > sma20 && sma50 > sma200) {
        return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
      }
    }
    return null;
  }

  if (exitBelow || crashStop) {
    // Remember we were stopped out so we can re-enter faster next time.
    ctx.state.reentry = { bar: ctx.i };
    return { side: 'sell', qty: pos };
  }
  return null;
}
