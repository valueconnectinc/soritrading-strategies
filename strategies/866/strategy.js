/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Band Mean Reversion 2
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy builds on the previous Bollinger Band Mean Reversion approach, which showed promising results in earlier backtests. It uses BB bands to identify overbought/oversold conditions and enters trades when prices deviate significantly from the mean, reverting toward it.
 * When it buys and sells: The strategy buys when price closes below the lower band and sells when price closes above the upper band, aiming to capture reversion movements.
 * When it does NOT work: This strategy may fail during strong trending markets, where price remains consistently above or below the bands for extended periods without reverting back to the mean.
 */

function onUpdate(ctx) {
  // Define Bollinger Band parameters
  const bbLength = 20;
  const bbMultiplier = 2.0;

  // Retrieve Bollinger Band values
  const bb = ctx.bb(bbLength, bbMultiplier, 0);
  if (bb == null) return null;

  // Get current price
  const price = ctx.price;

  // Check if we are in a position
  const inPosition = ctx.position !== 0;

  // If we are not in a position and price closes below lower band, enter long
  if (!inPosition && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // If we are in a long position and price closes above upper band, exit the position
  if (inPosition && price > bb.upper && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action needed
  return null;
}
