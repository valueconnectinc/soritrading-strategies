/*
 * @coinsori-strategy v1
 * name: Enhanced Mean Reversion with Trend Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines Bollinger Band mean reversion with MACD and RSI trend filters to avoid trading during strong trends, which is a common weakness of simple mean reversion strategies.
 * When it buys and sells: It buys when price touches the lower Bollinger Band and MACD and RSI confirm a bullish trend. It sells when price reaches the upper Bollinger Band and trend filters indicate bearish conditions.
 * When it does NOT work: This strategy performs poorly during strong sustained trends or in ranging markets where neither Bollinger Bands nor trend filters provide clear signals, leading to frequent whipsaws.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20 period and 2 std dev
  const macd = ctx.macd(12, 26, 9);
  const rsi = ctx.rsi(14);
  
  // Check if indicators are ready (guard against null values)
  if (bb == null || macd == null || rsi == null) return null;
  
  // Fetch current price
  const price = ctx.price;
  
  // Define conditions for buying and selling
  // Buy condition: Price touches lower Bollinger Band and trend is bullish (MACD > signal, RSI < 30)
  const buyCondition = (price <= bb.lower) && (macd.macd > macd.signal) && (rsi < 30);
  
  // Sell condition: Price touches upper Bollinger Band and trend is bearish (MACD < signal, RSI > 70) 
  const sellCondition = (price >= bb.upper) && (macd.macd < macd.signal) && (rsi > 70);
  
  // Exit all positions if no conditions are met
  if (!buyCondition && !sellCondition) {
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }
  
  // If we're long and want to exit, sell
  if (ctx.position > 0 && sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // If we're not long and want to enter, buy
  if (ctx.position == 0 && buyCondition) {
    const qty = ctx.cash / price * 0.99; // Use 99% of cash for entry
    return { side: 'buy', qty: qty };
  }
  
  return null;
}
