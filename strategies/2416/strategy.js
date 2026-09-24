/*
 * @coinsori-strategy v1
 * name: ETH Trend Donchian-15 Breakout 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 20-day Donchian breakout cut MDD and improved the 2018-21
 * window (+212% vs champion +144%) but gave up the 2024-26 bull (+33% vs +69%)
 * because the 20-day window was too slow. The 10-day version recovered the chop
 * window but gave up even more bull. This variant uses a MIDDLE 15-day window to
 * balance: keep most of the breakout's chop/MDD benefit while recovering bull
 * participation.
 * When it buys and sells: Buy when price closes at a fresh 15-day high AND above the
 * 50-day average AND the 50-day average is rising. Sell when price closes 1 ATR below
 * the average, or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: A 15-day window still delays re-entry at sharp V-recoveries,
 * and it is long-only so it does not profit from shorting bear markets.
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

  // Donchian breakout over the PRIOR 15 bars (k=2..16, excluding px itself).
  let high15 = 0;
  for (let k = 2; k <= 16; k++) {
    const c = closes[closes.length - 1 - k];
    if (c != null && c > high15) high15 = c;
  }
  const breakout = px > high15; // fresh 15-day high
  const regimeUp = sma50 > sma50Prev; // 50-day average rising = bull regime intact
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
