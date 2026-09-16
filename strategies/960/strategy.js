/*
 * @coinsori-strategy v1
 * name: Simple Mean Reversion with SMA and Bollinger Bands
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy leverages the concept of mean reversion by using simple moving averages and Bollinger Bands to identify overbought and oversold conditions. When the price crosses below the lower Bollinger Band, it is considered oversold and a buy signal is generated. Likewise, when the price crosses above the upper Bollinger Band, it is considered overbought and a sell signal is generated.
 * When it buys and sells: The strategy buys when the price crosses below the lower Bollinger Band and sells when the price crosses above the upper Bollinger Band.
 * When it does NOT work: This strategy may not perform well in strongly trending markets where prices can remain at extremes for extended periods, leading to frequent false signals.
 */
function onUpdate(ctx) {
  // Define parameters
  const smaLength = 20;
  const bbLength = 20;
  const bbMultiplier = 2;

  // Calculate SMA and Bollinger Bands
  const sma = ctx.sma(smaLength);
  const bb = ctx.bb(bbLength, bbMultiplier);

  // Check for valid data
  if (sma == null || bb == null || bb.lower == null || bb.upper == null) {
    return null;
  }

  // Buy condition: Price crosses below the lower Bollinger Band
  if (ctx.price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price crosses above the upper Bollinger Band
  if (ctx.price > bb.upper) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action otherwise
  return null;
}
