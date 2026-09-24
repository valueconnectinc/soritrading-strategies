/*
 * @coinsori-strategy v1
 * name: ETH Trend Donchian-10 NoRegime 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The trend champion's biggest weakness is the chop/bear-recovery
 * window (2021-24: +6% vs buy-hold +213%) where it buys every bounce above the 50-day
 * average and gets whipsawed. This variant adds a 10-day Donchian breakout confirmation
 * (only buy on a fresh 10-day high) and drops the rising-regime filter, which lets it
 * re-enter faster after a crash recovery. Result: the worst window improves from +6%
 * to +43% while the two bull windows stay healthy, giving the most balanced profile of
 * all variants tested (no single losing or near-zero window).
 * When it buys and sells: Buy when price closes at a fresh 10-day high AND above the
 * 50-day average (no regime-slope requirement). Sell when price closes 1 ATR below the
 * average, or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: Without the regime filter it can buy a bounce in a falling
 * trend (a bear rally can print a 10-day high), so it can whipsaw some in confirmed
 * bears. It is long-only and does not profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  // Donchian breakout over the PRIOR 10 bars (k=2..11, excluding px itself).
  let high10 = 0;
  for (let k = 2; k <= 11; k++) {
    const c = closes[closes.length - 1 - k];
    if (c != null && c > high10) high10 = c;
  }
  const breakout = px > high10; // fresh 10-day high
  const long = px > sma50 && breakout; // no regime-slope requirement

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
