/*
 * @coinsori-strategy v1
 * name: ETH Fast-Structure Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The sma50>sma200 uptrend-structure filter fixed the 2018 and
 * 2021-2022 windows but underperformed in 2023+ because the 50-day stays below the
 * 200-day too long during bull corrections, blocking re-entries. This version uses
 * a FASTER structure reference (50-day above 100-day) that unblocks re-entry
 * sooner, keeping more of the 2023+ bull while still filtering out broken
 * downtrends. The bet: the medium-term trend stack (50 over 100) is a responsive
 * uptrend signal that avoids bear dip-buys without the lag of the 200-day.
 * When it buys and sells: Buy when price is above the 50-day average AND the
 * 50-day is above the 100-day (sized down in high volatility / extreme fear).
 * Sell when price closes 1 ATR below the 50-day average, or drops 2.5 ATRs below
 * it in a crash.
 * When it does NOT work: A faster reference is noisier, so it can whipsaw more in
 * choppy sideways markets, and it can let in bear bounces before the 100-day turns
 * down. Long-only.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 120) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma100 == null || atr == null || px <= 0) return null;

  const long = px > sma50 && sma50 > sma100; // fast uptrend structure: 50 above 100
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // deep crash bail-out

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
