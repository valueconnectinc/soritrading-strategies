/*
 * @coinsori-strategy v1
 * name: Trend Filtered Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy combines mean reversion with a trend filter to avoid trading against the prevailing trend. It aims to enter long positions when price is below a certain level and trend is upwards.
 * When it buys and sells: It buys when price is below the upper Bollinger Band (BB) and the overall trend (SMA) is up. It closes position when price crosses back above BB or if the trend flips.
 * When it does NOT work: This strategy may fail in strong trending markets where mean reversion logic doesn't apply.
 */
function onUpdate(ctx) {
  // Define indicator periods
  const smaLength = 50;
  const bbLength = 20;
  const bbMult = 2;

  // Get indicators
  const sma = ctx.sma(smaLength);
  const bb = ctx.bb(bbLength, bbMult);

  // Guard against null values (warm-up period)
  if (sma == null || bb == null || bb.upper == null || bb.lower == null) return null;

  // Current price and position
  const price = ctx.price;
  const position = ctx.position;

  // Trend filter: buy only when price is above SMA (up trend)
  const trendUp = price > sma;

  // Entry conditions: price below lower BB and trend up
  const entryCondition = price < bb.lower && trendUp;

  // Exit conditions: price crosses upper BB or trend flips
  const exitCondition = price > bb.upper || !trendUp;

  // Order execution
  if (position === 0 && entryCondition) {
    // Buy when condition is met and no position exists
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (position > 0 && exitCondition) {
    // Sell to close when exiting condition met
    return { side: 'sell', qty: position };
  }

  // Do nothing otherwise
  return null;
}
