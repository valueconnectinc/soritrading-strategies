/*
 * @coinsori-strategy v1
 * name: ETH Gated Wide-Hysteresis 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion's two worst windows are 2018 (rides the top
 * crash) and 2021-2022 (whipsaws out of the volatile bull). This version combines
 * two levers: a 200-day PRICE gate (only open longs above the 200-day average, so
 * it stops buying in the 2022 bear) and a wider 1.5-ATR exit (tolerates deeper
 * pullbacks, so fewer whipsaws in the 2021 bull). The bet: a long-only trend
 * strategy should not be buying below its long-term average (falling knife) and
 * should tolerate the deep pullbacks that a high-volatility bull throws at it.
 * When it buys and sells: Buy when price is above BOTH the 50-day and the 200-day
 * average (sized down in high volatility / extreme fear). Sell when price closes
 * 1.5 ATRs below the 50-day average, or drops 3 ATRs below it in a crash.
 * When it does NOT work: The 200-day gate can make it miss the early recovery of a
 * new bull (waits for price to climb back above the 200-day), and the wider exit
 * gives back more profit in a topping range. Long-only, so no profit from shorting.
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

  const long = px > sma50 && px > sma200; // price gate: only enter above 200-day
  const exitBelow = px < sma50 - 1.5 * atr; // wider hysteresis: tolerate deeper pullbacks
  const crashStop = px < sma50 - 3.0 * atr; // deep crash bail-out

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
