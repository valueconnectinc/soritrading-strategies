/*
 * @coinsori-strategy v1
 * name: Improved Mean Reversion with Macro Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy enhances the traditional mean reversion by incorporating macroeconomic indicators to filter trade signals. It aims to reduce false signals during volatile market conditions.
 * When it buys and sells: The strategy enters long positions when BTC price crosses above the upper Bollinger Band, and exits when it crosses below the lower Bollinger Band, but only in periods where the macro indicator shows a stable market environment.
 * When it does NOT work: This strategy may underperform during strong trending markets or when macro indicators fail to capture sudden regime changes. It also may not perform well if the selected macro indicator is not a good proxy for market stability.
 */
function onUpdate(ctx) {
  // Fetching required indicators
  const bb = ctx.bb(20, 2, 0); // Bollinger Bands with 20 period and 2 standard deviations
  const sma = ctx.sma(50, 0);  // 50-period Simple Moving Average
  const price = ctx.price;
  
  // Fetch macro data (this strategy uses fear and greed index)
  const fearGreed = ctx.data('fear_greed');
  
  // Check if indicators are valid
  if (bb == null || sma == null || fearGreed == null) return null;

  // Macro filter: Only trade when fear/greed index is between 30 and 70 (neutral market)
  const macroFilter = fearGreed > 30 && fearGreed < 70;

  // Check for entry conditions
  if (price > bb.upper && macroFilter) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Check for exit conditions
  if (price < bb.lower) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action if no condition is met
  return null;
}
