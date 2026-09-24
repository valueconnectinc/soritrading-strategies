/*
 * @coinsori-strategy v1
 * name: ETH Trend Donchian-Breakout Entry 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated trend champion rides price above its 50-day average
 * but its weakest window is chop (2021-24: +6% vs buy-hold +213%, MDD ~67%) where it
 * buys every bounce above the average and gets whipsawed. This variant adds a
 * Donchian price-channel confirmation: it only enters on a FRESH 20-day breakout
 * (price closes above the highest close of the PRIOR 20 bars) while the 50-day
 * average is still rising. A genuine breakout is much more likely to start a real
 * move than a chop bounce, so this should cut the whipsaw trades in flat markets
 * while still catching the big bull legs.
 * When it buys and sells: Buy when price closes at a fresh 20-day high AND above the
 * 50-day average AND the 50-day average is rising (regime intact). Sell when price
 * closes 1 ATR below the average, or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: The breakout requirement can delay re-entry at the start of a
 * sharp V-recovery (price must first make a new 20-day high), so it may miss the first
 * leg of a fast rebound. It is long-only and does not profit from shorting bears.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50Prev = ctx.sma(50, 11); // ~10 bars earlier, to gauge regime slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50Prev == null || atr == null || px <= 0) return null;

  // Donchian breakout: px must exceed the highest close of the PRIOR 20 bars (k=2..21,
  // so the window excludes px itself — otherwise px can never beat its own window).
  let high20 = 0;
  for (let k = 2; k <= 21; k++) {
    const c = closes[closes.length - 1 - k];
    if (c != null && c > high20) high20 = c;
  }
  const breakout = px > high20; // fresh 20-day high = genuine breakout, not a chop bounce
  const regimeUp = sma50 > sma50Prev; // 50-day average still rising = bull regime intact
  const long = px > sma50 && breakout && regimeUp;

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
