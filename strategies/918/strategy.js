/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Trading within Bollinger Band channels, entering at mean reversion points (price touches upper/lower band).
 * When it buys and sells: Buys when price touches the lower band and sells when it touches the upper band.
 * When it does NOT work: In strong trending markets where price stays consistently above or below the bands for long periods.
 */
function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbLength = 20;
  const bbMult = 2.0;

  // Get Bollinger Band values
  const bb = ctx.bb(bbLength, bbMult, 0);
  if (bb == null) return null;

  const lower = bb.lower;
  const upper = bb.upper;
  const middle = bb.middle;

  // Previous bar values
  const bbPrev = ctx.bb(bbLength, bbMult, 1);
  if (bbPrev == null) return null;

  const lowerPrev = bbPrev.lower;
  const upperPrev = bbPrev.upper;
  const middlePrev = bbPrev.middle;

  // Price values
  const price = ctx.price;
  const pricePrev = ctx.closes[1];

  // Check for entry conditions (mean reversion)
  // Buy when price touches the lower band
  if (pricePrev <= lowerPrev && price > lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell when price touches the upper band
  if (pricePrev >= upperPrev && price < upper) {
    return { side: 'sell', qty: ctx.position };
  }

  // Exit on opposite signal
  if (ctx.position > 0 && price >= middle) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
