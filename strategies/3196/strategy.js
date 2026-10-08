/*
 * @coinsori-strategy v1
 * name: ETH 1D Long-Horizon Momentum Hysteresis
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: same mechanism as the validated BTC 1D momentum hysteresis —
 * crypto's biggest gains come in long multi-month trends. A 90-day rate-of-change
 * entry with a 200-day trend gate only buys strong established trends, and hysteresis
 * (separate, lower exit threshold) avoids the whipsaw that breaks fast trend systems.
 * When it buys and sells: Buy when the 90-day price change is above +20% AND price is
 * above its 200-day average. Sell when the 90-day change falls below +5% or price drops
 * below the 200-day average.
 * When it does NOT work: in a long sideways/choppy market the slow signals whipsaw at
 * low frequency; in a fast V-reversal the 200-day gate exits late and gives back profit.
 */

function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91]; // 90 bars back
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100; // 90-day rate of change in %

  if (ctx.position > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: ctx.position };
  }
  if (ctx.position === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
