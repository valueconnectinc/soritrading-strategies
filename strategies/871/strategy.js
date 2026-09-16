/*
 * @coinsori-strategy v1
 * name: Multi-Asset Portfolio Strategy
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT ADAUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy diversifies risk across multiple assets to reduce exposure to any single asset's volatility. It uses a simple mean reversion approach on each asset, entering when price crosses below the moving average and exiting when it crosses back above.
 * When it buys and sells: The strategy enters long positions in assets that fall below their 20-period moving average, and exits when they cross back above the same average.
 * When it does NOT work: This approach may fail in strong trending markets where assets continue to move in one direction for extended periods, ignoring the trend and leading to frequent losses.
 */
function onUpdate(ctx) {
  // Define parameters
  const period = 20;
  
  // Ensure we only execute logic on bar close
  if (!ctx.state.prevBar) {
    ctx.state.prevBar = ctx.i;
  } else if (ctx.state.prevBar === ctx.i) {
    return null;
  } else {
    ctx.state.prevBar = ctx.i;
  }
  
  // Build orders array
  const orders = [];
  
  // Get the list of symbols to trade from the strategy definition.
  const assetList = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
  
  for (let i = 0; i < assetList.length; i++) {
    const sym = assetList[i];
    
    // Fetch historical prices and calculate SMAs
    const closes = ctx.closes(sym);
    if (closes == null || closes.length < period) continue;
    
    const sma = ctx.sma(period); // 20-period SMA
    const price = ctx.price(sym);
    
    // Guard against null values  
    if (sma == null || price == null) continue;
    
    // Entry condition: price crosses below SMA (mean reversion)
    const prevClose = closes[closes.length - 2];
    const prevSma = ctx.sma(period, 1); // 20-period SMA from previous bar
    if (prevClose >= prevSma && price < sma) {
      // Calculate quantity based on cash and price
      const qty = ctx.cash / ctx.price(sym) * 0.33; // Split capital among assets
      orders.push({
        side: 'buy',
        qty: qty,
        sym: sym
      });
    }
    
    // Exit condition (optional): price crosses back above SMA
    const position = ctx.pos(sym);
    if (position > 0 && ctx.price(sym) > sma) {
      orders.push({
        side: 'sell',
        qty: position,
        sym: sym
      });
    }
  }
  
  // Return orders
  return orders.length > 0 ? orders : null;
}
