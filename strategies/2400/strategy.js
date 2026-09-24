/*
 * @coinsori-strategy v1
 * name: ETH Uptrend-Structure Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion's whipsaw comes from buying in choppy,
 * non-trending conditions. This version adds a mild uptrend-structure filter:
 * only open a long when price is above the 50-day AND the 50-day is above the
 * 200-day (a proper uptrend stack). This is milder than a price-vs-200-day gate,
 * so it blocks entries in a broken/downtrending market without aggressively
 * blocking the fast re-entries the 2023+ bull rewards. The bet: long-only trend
 * strategies bleed when they buy in a market where the medium-term average sits
 * below the long-term average (no uptrend structure).
 * When it buys and sells: Buy when price is above the 50-day average AND the
 * 50-day is above the 200-day (sized down in high volatility / extreme fear).
 * Sell when price closes 1 ATR below the 50-day average, or drops 2.5 ATRs below
 * it in a crash.
 * When it does NOT work: It can lag a fresh bull's first leg (waits for the 50-day
 * to climb back above the 200-day), and it can still ride a grind-down before the
 * 50-day crosses below the 200-day. Long-only.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma200 == null || atr == null || px <= 0) return null;

  const long = px > sma50 && sma50 > sma200; // uptrend structure: 50-day above 200-day
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
