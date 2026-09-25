/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Fear & Greed index is a sentiment gauge. Extreme fear
 *   (index < 25) historically marks capitulation bottoms in crypto; buying into
 *   that fear, but only while the longer trend is intact, catches reversals.
 * When it buys and sells: Buy when Fear & Greed < 25 AND price is above its
 *   200-day SMA. Sell when Fear & Greed > 60 (greed) or price drops below the
 *   200-day SMA.
 * When it does NOT work: In a sustained bear market the 200-SMA gate keeps it
 *   mostly in cash (defensive), and extreme fear can persist for months in a
 *   true capitulation — entries can be early and painful.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null;
  const sma = ctx.sma(200, 1);
  const price = ctx.price;
  if (sma == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    const fgNow = ctx.data('fg');
    if (fgNow == null) return null;
    if (fgNow > 60 || price < sma) return { side: 'sell', qty: pos };
    return null;
  }
  if (fg < 25 && price > sma) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
