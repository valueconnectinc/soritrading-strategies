/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Slope-Filtered 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend champion rides price above its 50-day
 * average, but its documented weakness is losing in prolonged chop/crash windows (e.g.
 * 2021-2024) where price hovers near a flat average and it whipsaws. This variant adds
 * a trend-strength gate: only enter long when the 50-day average itself is rising, so
 * it does not buy into a flat or falling regime. Same hysteresis exit and crash stop.
 * When it buys and sells: Buy when the last closed price is above the 50-day average
 * AND that average is rising (higher than it was ~10 bars ago). Sell when price closes
 * 1 ATR below the average, or drops 2.5 ATRs below it in a crash. Sizing down in high
 * volatility and extreme fear.
 * When it does NOT work: The slope gate can delay entry at the very start of a new bull
 * (average still flat/falling), so it may miss the first leg of a sharp V-recovery. It
 * is still long-only and does not profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50Prev = ctx.sma(50, 11); // average ~10 bars earlier, to gauge its slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50Prev == null || atr == null || px <= 0) return null;

  const trendUp = sma50 > sma50Prev; // the 50-day average is rising
  const long = px > sma50 && trendUp;
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
