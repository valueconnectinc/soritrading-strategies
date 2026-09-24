/*
 * @coinsori-strategy v1
 * name: ETH Deep-Bear Gate Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Strict regime gates (enter only above the 200-day, or only
 * when the 200-day is rising) fixed the 2018/2021 whipsaw but badly hurt the
 * 2023+ bull because price dips below the 200-day mid-rally. This version uses a
 * SOFT gate: it only blocks entries when price has fallen 20% or more below the
 * 200-day average (a deep bear / falling-knife regime), and otherwise lets the
 * champion's normal trend logic run. The bet: shallow pullbacks below the 200-day
 * in a bull are recoverable, but a -20% breach of the long-term average marks a
 * durable bear where dip-buys bleed.
 * When it buys and sells: Buy when price is above the 50-day average AND not more
 * than 20% below the 200-day average (sized down in high volatility / extreme
 * fear). Sell when price closes 1 ATR below the 50-day average, or drops 2.5 ATRs
 * below it in a crash.
 * When it does NOT work: It can still take a -20% drawdown before the gate blocks
 * re-entry, and it misses the bottom of a deep bear-to-bull turn (waits for price
 * to climb back within 20% of the 200-day). Long-only.
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

  const notDeepBear = px > sma200 * 0.8; // soft gate: block only deep falling knives
  const long = px > sma50 && notDeepBear;
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
