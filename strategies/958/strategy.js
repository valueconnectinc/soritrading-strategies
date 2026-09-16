/*
 * @coinsori-strategy v1
 * name: Bollinger Band + Momentum Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy combines Bollinger Bands for volatility detection and a momentum indicator to identify entry points. It aims to capture strong price movements when the asset is breaking out of a volatile range.
 * When it buys and sells: The strategy buys when price breaks above the upper Bollinger Band, indicating a strong upward momentum. It sells when price breaks below the lower Bollinger Band, signaling a downward momentum.
 * When it does NOT work: This strategy may fail during sideways markets where price remains within the Bollinger Bands for long periods. In such regimes, frequent false signals and whipsaws can lead to significant drawdowns.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbLength = 20;
  const bbMult = 2;

  // Momentum indicator length
  const momentumLength = 10;

  // Get Bollinger Bands values
  const bb = ctx.bb(bbLength, bbMult, 0);
  if (bb == null) return null;

  const upperBB = bb.upper;
  const lowerBB = bb.lower;
  const middleBB = bb.middle;

  // Get momentum value
  const momentum = ctx.change(momentumLength, 0);
  if (momentum == null) return null;

  // Define entry conditions
  const price = ctx.price;

  // Buy when price breaks above upper Bollinger Band with strong momentum
  if (price > upperBB && momentum > 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell when price breaks below lower Bollinger Band with strong momentum
  if (price < lowerBB && momentum < 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
