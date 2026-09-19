/*
 * @coinsori-strategy v1
 * name: EMA Cross + Volume Filter MATIC
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 1000
 *
 * Buys when the fast EMA crosses above the slow EMA, confirmed by above-average volume.
 * Sells on the reverse EMA cross or if price drops 3% below the entry (tight stop).
 * Simple trend-following: catches trending moves, avoids low-volume false breakouts.
 * Works in trending markets with volume participation.
 * Fails in choppy markets with whipsaw EMA crosses and low-volume breakouts.
 */
function onUpdate(ctx) {
  const fastLen = 9;
  const slowLen = 21;
  const volLen = 20;
  const volMult = 1.1; // volume must be this fraction above average
  const stopLoss = 0.03; // 3% hard stop

  const fast = ctx.ema(fastLen);
  const slow = ctx.ema(slowLen);
  const avgVol = ctx.avgVol(volLen);
  if (fast == null || slow == null || avgVol == null || avgVol === 0) return null;

  const volOk = ctx.vol >= avgVol * volMult;

  // Crossovers: compare current vs previous bar
  const f0 = fast, f1 = ctx.ema(fastLen, 1);
  const s0 = slow, s1 = ctx.ema(slowLen, 1);
  if (f1 == null || s1 == null) return null;

  const bullCross = f1 <= s1 && f0 > s0;
  const bearCross = f1 >= s1 && f0 < s0;

  const hasPos = ctx.position > 0;

  if (!hasPos) {
    if (bullCross && volOk) {
      ctx.state.entryPrice = ctx.price;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // Stop-loss: price fell 3% from entry
  const entryPx = ctx.state.entryPrice || 0;
  const hitStop = entryPx > 0 && ctx.price <= entryPx * (1 - stopLoss);

  if (bearCross || hitStop) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
