/*
 * @coinsori-strategy v1
 * name: Simple Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This is a simple mean reversion strategy based on Bollinger Bands. It buys when price crosses below the lower band and sells when it crosses above the upper band. The strategy aims to capture price reversion in ranging markets.
 * When it buys and sells: It buys when the price closes below the lower Bollinger Band, and sells when it closes above the upper Bollinger Band.
 * When it does NOT work: This strategy fails in strong trending markets where price does not revert to its mean. The strategy also doesn't adapt well to volatility changes during trending periods and can generate frequent false signals.
 */

function onUpdate(ctx) {
  // Get required indicators
  const bb = ctx.bb(20, 2, 0);
  const prevBb = ctx.bb(20, 2, 1);

  // Ensure indicators are ready
  if (bb == null || prevBb == null) {
    return null;
  }

  // Get latest closing prices and position
  const price = ctx.price;
  const position = ctx.position;

  // Bollinger Band values
  const bbLower = bb.lower;
  const bbUpper = bb.upper;
  const prevBbLower = prevBb.lower;
  const prevBbUpper = prevBb.upper;

  // Check for crossover conditions:
  // Buy condition: Price crosses below lower BB (from above)
  // Sell condition: Price crosses above upper BB (from below)

  const buyCondition = price < bbLower && prevBbLower >= bbLower;
  const sellCondition = price > bbUpper && prevBbUpper <= bbUpper;

  if (position > 0) {
    // If we are long, and sell condition is met, close the position
    if (sellCondition) {
      return { side: 'sell', qty: position };
    }
  } else if (position < 0) {
    // If we are short, and buy condition is met, close the position
    if (buyCondition) {
      return { side: 'buy', qty: Math.abs(position) };
    }
  } else {
    // No position open, check for entry conditions
    if (buyCondition) {
      // Calculate quantity to buy - 99% of cash
      const qty = ctx.cash / price * 0.99;
      return { side: 'buy', qty: qty };
    } else if (sellCondition) {
      // Calculate quantity to sell - 99% of position size or max available
      const qty = ctx.cash / price * 0.99;
      return { side: 'sell', qty: qty };
    }
  }

  return null;
}
