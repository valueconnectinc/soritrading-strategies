/*
 * @coinsori-strategy v1
 * name: MACD + Bollinger Bands Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD crossovers with Bollinger Band reversion logic to capture both trend and mean-reversion opportunities. It enters trades when the MACD shows a strong signal, and exits when price reaches a Bollinger Band level.
 * When it buys and sells: It buys on upward MACD crossover when price is below the lower Bollinger Band, and sells on downward MACD crossover when price is above the upper Bollinger Band.
 * When it does NOT work: In strong trending markets, this strategy may generate false signals as it tries to reverse a trend that continues in the same direction.
 */
function onUpdate(ctx) {
  // Calculate required indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const prev_macd = ctx.macd(12, 26, 9, 1);
  const bb = ctx.bb(20, 2, 0);
  const prev_bb = ctx.bb(20, 2, 1);
  
  // Check for valid indicator data
  if (macd == null || prev_macd == null || bb == null || prev_bb == null) return null;
  
  // Entry and exit conditions using MACD and Bollinger Bands
  const aboveUpperBand = ctx.price > bb.upper;
  const belowLowerBand = ctx.price < bb.lower;
  
  // Buy condition: MACD crossover up + price below lower band
  if (prev_macd.macd <= prev_macd.signal && macd.macd > macd.signal && belowLowerBand) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: MACD crossover down + price above upper band
  if (prev_macd.macd >= prev_macd.signal && macd.macd < macd.signal && aboveUpperBand) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
