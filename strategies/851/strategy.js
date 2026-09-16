/*
 * @coinsori-strategy v1
 * name: Multi-Condition Entry Strategy v2
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This is an improved version of the multi-condition entry strategy. It aims to reduce false signals by using additional filters such as price action confirmation and volatility.
 * When it buys and sells: The strategy buys when RSI is below 30 (oversold) and MACD line crosses above the signal line, with volume increasing and recent price action showing bullish reversal patterns. It sells when RSI is above 70 (overbought) and MACD line crosses below the signal line, with volume increasing and recent price action showing bearish reversal patterns.
 * When it does NOT work: This strategy may fail during strong trending markets where price action confirms trends rather than reversals, or in low volatility environments where volume filters are not effective. It also might be affected by sudden market shocks that disrupt normal price patterns.
 */
function onUpdate(ctx) {
  // Get indicators
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  
  // Volume filter
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Price action confirmation - check if current bar shows reversal pattern
  const close = ctx.price;
  const prevClose = ctx.closes[1];
  const prevPrevClose = ctx.closes[2];
  
  // A simple price action filter: 3 consecutive candlesticks where last one closes higher than the previous two
  const bullishReversal = (close > prevClose && prevClose > prevPrevClose);
  const bearishReversal = (close < prevClose && prevClose < prevPrevClose);
  
  // Volatility (ATR) filter
  const atr = ctx.atr(14);
  const priceChange = Math.abs(close - prevClose);
  
  // Guard against null values
  if (rsi == null || macd == null || macd.macd == null || macd.signal == null || vol == null || avgVol == null || 
      close == null || prevClose == null || prevPrevClose == null || atr == null) {
    return null;
  }
  
  // Previous bar indicators
  const rsiPrev = ctx.rsi(14, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  if (rsiPrev == null || macdPrev == null || macdPrev.macd == null || macdPrev.signal == null) {
    return null;
  }
  
  // Buy condition
  // RSI is in oversold region, MACD line crosses above signal line, volume increases, and price action confirms reversal
  const buyCondition = (rsi < 30 && rsiPrev >= 30 && 
                        macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal &&
                        vol > avgVol * 1.2 &&
                        bullishReversal &&
                        priceChange > atr * 0.5);
  
  // Sell condition  
  // RSI is in overbought region, MACD line crosses below signal line, volume increases, and price action confirms reversal
  const sellCondition = (rsi > 70 && rsiPrev <= 70 && 
                         macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal &&
                         vol > avgVol * 1.2 &&
                         bearishReversal &&
                         priceChange > atr * 0.5);
  
  // Execute orders  
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
