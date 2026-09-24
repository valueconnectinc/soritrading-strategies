/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Champion StrongHold WideCrash 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend recipe with a targeted fix for its
 * known weakness: in a strong bull market it used to exit on normal pullbacks and
 * the 2021-2022 window underperformed. This version HOLDS through pullbacks in a
 * strong bull regime and widens the crash stop there, so a sharp-but-normal bull
 * dip (like May 2021) does not kick it out; it only exits when the trend actually
 * turns (price closing 1 ATR below the 50-day) or on a truly catastrophic crash.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or fear is extreme. In a strong bull regime
 * (above the 200-day and far above the 50-day) hold through small pullbacks and use
 * a wider crash stop; otherwise the normal hysteresis (1 ATR below) and crash stop
 * apply.
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

  // STRONG BULL REGIME: above the 200-day average AND far above the 50-day
  // (>= 1.5 ATR). In this regime a pullback is normal bull noise, so hold through
  // the small hysteresis exit and use a much wider crash stop (4 ATR) so a sharp
  // bull dip like May 2021 does not kick us out early.
  const strongBull = px > sma200 && (px - sma50) >= 1.5 * atr;
  const crashStop = strongBull
    ? px < sma50 - 4.0 * atr   // wide crash stop in strong bull
    : px < sma50 - 2.5 * atr;  // normal crash stop otherwise

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

  // In strong bull, skip the small hysteresis exit; only the (wider) crash stop exits.
  const shouldExit = crashStop || (exitBelow && !strongBull);
  if (shouldExit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
