/*
 * @coinsori-strategy v1
 * name: Enhanced Bollinger Band + Momentum Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This enhanced strategy builds upon the basic Bollinger Band and momentum approach by adding a volatility filter using ATR. It aims to avoid false signals during low-volatility periods and only take trades when there is sufficient price movement.
 * When it buys and sells: The strategy buys when price breaks above the upper Bollinger Band and the ATR value exceeds a threshold, indicating strong momentum and volatility. It sells when price breaks below the lower Bollinger Band with high volatility.
 * When it does NOT work: This strategy may fail during extremely low-volatility periods where the ATR filter prevents any trades. It also risks missing opportunities in strong trending markets if the volatility is not high enough to trigger the buy/sell signals.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbLength = 20;
  const bbMult = 2;

  // Momentum indicator length
  const momentumLength = 10;

  // ATR Length
  const atrLength = 14;

  // ATR Threshold for volatility filter
  const atrThreshold = 1.5;

  // Get Bollinger Bands values
  const bb = ctx.bb(bbLength, bbMult, 0);
  if (bb == null) return null;

  const upperBB = bb.upper;
  const lowerBB = bb.lower;
  const middleBB = bb.middle;

  // Get momentum value
  const momentum = ctx.change(momentumLength, 0);
  if (momentum == null) return null;

  // Get ATR value
  const atr = ctx.atr(atrLength, 0);
  if (atr == null) return null;

  // Define entry conditions with volatility filter
  const price = ctx.price;

  // Buy condition: Price breaks above upper BB and ATR is above threshold
  if (price > upperBB && momentum > 0 && atr > atrThreshold) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price breaks below lower BB and ATR is above threshold
  if (price < lowerBB && momentum < 0 && atr > atrThreshold) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
