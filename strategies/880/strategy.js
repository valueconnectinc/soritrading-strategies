/*
 * @coinsori-strategy v1
 * name: Volatility Breakout Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy identifies breakouts from volatile price ranges using the Average True Range (ATR) to determine volatility. It enters a long position when price breaks above the upper Bollinger Band and closes when it falls below the lower band.
 * When it buys and sells: It buys when price breaks above the upper Bollinger Band and sells when it crosses below the lower band.
 * When it does NOT work: This strategy fails in range-bound markets or during periods of low volatility, where breakout signals are not reliable or where price movements are too flat to generate significant profits.
 */

function onUpdate(ctx) {
  // Get ATR for volatility filtering
  const atrLength = 14;
  const atrValue = ctx.atr(atrLength, 1);

  if (atrValue === null) return null;

  // Use Bollinger Bands as breakout filters
  const bbLength = 20;
  const bbMultiplier = 2;
  const bbResult = ctx.bb(bbLength, bbMultiplier, 1);

  if (bbResult === null) return null;

  const upperBand = bbResult.upper;
  const lowerBand = bbResult.lower;
  const middleBand = bbResult.middle;

  // Buy condition: price breaks above the upper Bollinger Band
  if (ctx.price > upperBand) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: price falls below the lower Bollinger Band
  if (ctx.price < lowerBand) {
    return { side: 'sell', qty: ctx.position };
  }

  // Default behavior: do nothing
  return null;
}
