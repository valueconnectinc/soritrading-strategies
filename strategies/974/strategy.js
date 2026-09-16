/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT ADAUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy bets on the mean-reverting behavior of multiple assets. By using a moving average crossover across different cryptocurrencies, it aims to capture short-term price reversions while diversifying risk.
 * When it buys and sells: It buys when a cryptocurrency's price crosses above its moving average and sells when it crosses below. The position size is allocated equally among the assets.
 * When it does NOT work: This strategy works poorly in trending markets where assets move in the same direction for extended periods, leading to frequent whipsaws and losses.
 */

function onUpdate(ctx) {
  const { cash, position } = ctx;
  
  // If already in a position, do nothing
  if (position !== 0) return null;
  
  // Parameters
  const smaLength = 20;
  const buyThreshold = 1.005; // 0.5% threshold to avoid frequent trades
  const sellThreshold = 0.995; // 0.5% threshold to avoid frequent trades
  
  // Initialize order array
  let orders = [];
  
  // Loop through each symbol
  for (let i = 0; i < ctx.syms.length; i++) {
    const sym = ctx.syms[i];
    
    // Switch context to the symbol
    ctx.sym = sym;
    
    // Calculate SMA and price
    const sma = ctx.sma(smaLength);
    const price = ctx.price;
    
    // Guard against null indicators
    if (sma == null) continue;
    
    // Check if price crossed above or below SMA
    const ratio = price / sma;
    
    if (ratio > buyThreshold) {
      // Price is above SMA - consider buying
      orders.push({ side: 'buy', qty: cash / ctx.syms.length / price * 0.99 });
    } else if (ratio < sellThreshold) {
      // Price is below SMA - consider selling
      orders.push({ side: 'sell', qty: position });
    }
  }
  
  // Return all orders
  return orders.length > 0 ? orders : null;
}
