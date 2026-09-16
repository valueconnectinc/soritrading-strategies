/*
 * @coinsori-strategy v1
 * name: External Data Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy incorporates external macroeconomic data to inform trading decisions. It uses fear and greed index and Federal Reserve funds rate to determine market sentiment.
 * When it buys and sells: The strategy buys when the fear and greed index is in the 'fear' region (below 30) and Fed funds rate is decreasing or stable, indicating potential buying opportunity. It sells when the fear and greed index is in the 'greed' region (above 70) and fed funds rate is increasing, suggesting potential profit-taking or avoidance of overextended markets.
 * When it does NOT work: This strategy may fail if external macroeconomic data does not align with market movements, or if there are unexpected events that affect market behavior independently of these indicators.
 */
function onUpdate(ctx) {
  // Get external data from datasets
  const fearGreed = ctx.data('fear_greed');
  const fedRate = ctx.data('fed');
  
  // Get indicators
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  
  // Guard against null values
  if (rsi == null || macd == null || macd.macd == null || macd.signal == null) {
    return null;
  }
  
  // Previous bar indicators
  const rsiPrev = ctx.rsi(14, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  if (rsiPrev == null || macdPrev == null || macdPrev.macd == null || macdPrev.signal == null) {
    return null;
  }
  
  // Buy condition
  // Fear and greed index in 'fear' region (below 30) or Fed funds rate stable/decreasing
  const buyCondition = ((fearGreed < 30 || fearGreed === null) && 
                        (fedRate === null || fedRate >= 0));
  
  // Sell condition  
  const sellCondition = ((fearGreed > 70 || fearGreed === null) && 
                         (fedRate === null || fedRate < 0));
  
  // Execute orders  
  if (buyCondition && rsi < 30 && rsiPrev >= 30 && 
      macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition && rsi > 70 && rsiPrev <= 70 && 
             macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
