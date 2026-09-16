/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion Strategy
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy bets on the mean reversion property of price movements within Bollinger Bands. When the price moves beyond the upper or lower band, it is expected to revert back towards the middle band.
 * When it buys and sells: It buys when the price touches the lower band and sells when it touches the upper band.
 * When it does NOT work: This strategy may fail during strong trending markets where prices move consistently beyond the bands for extended periods, not reverting back quickly.
 */

function onUpdate(ctx) {
  // Get Bollinger Band values
  const bb = ctx.bb(20, 2); // 20 period, 2 standard deviations
  if (bb == null) return null;

  // Get current price and position data
  const price = ctx.price;
  const position = ctx.position;

  // Define thresholds for mean reversion signals
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const middleBand = bb.middle;

  // BUY condition: Price touches or goes below the lower band (mean reversion signal)
  if (price <= lowerBand && position <= 0) {
    // Return a buy order with 99% of available cash
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // SELL condition: Price touches or goes above the upper band (mean reversion signal)
  if (price >= upperBand && position > 0) {
    // Return a sell order to close the position
    return { side: 'sell', qty: position };
  }

  // Do nothing if conditions are not met
  return null;
}
