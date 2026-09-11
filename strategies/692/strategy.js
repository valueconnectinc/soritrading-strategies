/*
 * @coinsori-strategy v1
 * name: Bollinger Band Breakout Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses Bollinger Bands to identify potential breakouts. It aims to enter trades when the price breaks out of the bands, signaling a possible continuation of the current trend.
 * When it buys and sells: It buys when the price breaks above the upper Bollinger Band and sells when it breaks below the lower Bollinger Band. The strategy also considers the volume to confirm the breakout.
 * When it does NOT work: This strategy may not perform well in ranging markets where prices do not break out of the bands frequently, resulting in low trading frequency and missed opportunities.
 */

function onUpdate(ctx) {
  // Get Bollinger Bands
  const bb = ctx.bb(20, 2, 1);

  if (bb == null || bb.upper == null || bb.lower == null) {
    return null;
  }

  // Get current price and volume
  const price = ctx.price;
  const vol = ctx.vol;

  // Confirm breakout with volume
  const avgVol = ctx.avgVol(20);

  if (avgVol == null) {
    return null;
  }

  // Buy condition: Price breaks above the upper band with volume confirmation
  if (price > bb.upper && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price breaks below the lower band with volume confirmation
  if (price < bb.lower && vol > avgVol) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
