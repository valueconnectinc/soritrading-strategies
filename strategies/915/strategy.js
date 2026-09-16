/*
 * @coinsori-strategy v1
 * name: Macro_Trend_Filtered_Mean_Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy attempts to reduce the risk of mean reversion strategies in trending markets by using macro indicators as a filter. It uses fear and greed index to determine market sentiment, and only enters trades when the market is either fearful or greedy (indicating potential reversal).
 * When it buys and sells: It buys when the price hits the lower Bollinger Band and the fear/greed index is below 30 (fearful) or above 70 (greedy), and sells when the price reaches the upper Bollinger Band and the same sentiment condition is met.
 * When it does NOT work: This strategy will not work in markets that are consistently neutral or flat, as it relies on clear market sentiment to determine entry points. It also might underperform if the fear/greed index fails to accurately reflect the market state.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2); 
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  const fearGreed = ctx.data('fear_greed');
  
  // Validate all indicators
  if (bb == null || rsi == null || macd == null || fearGreed == null) return null;

  // Get current price and Bollinger Band values
  const price = ctx.price;
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  
  // Define conditions for entry: RSI, BB, and macro filter
  const isBelowLowerBand = price <= lowerBand;
  const isAboveUpperBand = price >= upperBand;
  const isFearsome = fearGreed < 30; // Fearful market (fear >= 70 = greedy)
  const isGreedy = fearGreed > 70;
  
  // If we are short or flat, and we have a clear reversal signal from lower BB with fear/greed
  if ((ctx.position <= 0) && isBelowLowerBand && (isFearsome || isGreedy)) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // If we are long, and we have a clear reversal signal from upper BB with fear/greed
  if ((ctx.position > 0) && isAboveUpperBand && (isFearsome || isGreedy)) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
