/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT,ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy employs mean reversion across multiple assets (BTC and ETH) to diversify risk. It also incorporates a volatility filter based on ATR to avoid trading during high-volatility periods.
 * When it buys and sells: The strategy enters long positions when the price crosses above the upper Bollinger Band in either BTC or ETH, and exits when it crosses below the lower Bollinger Band, but only if the ATR is below a certain threshold.
 * When it does NOT work: This strategy may not perform well during strong trending markets where mean reversion fails. Additionally, it can underperform if volatility thresholds are set too strictly, reducing trading opportunities.
 */
function onUpdate(ctx) {
  // Fetching required indicators for both assets
  const btcBB = ctx.bb(20, 2, 0);
  const ethBB = ctx.bb(20, 2, 0);
  const btcATR = ctx.atr(14, 0);
  const ethATR = ctx.atr(14, 0);
  const price = ctx.price;

  // Check if indicators are valid
  if (btcBB == null || ethBB == null || btcATR == null || ethATR == null) return null;

  // Define volatility threshold (using ATR to measure market volatility)
  const volatilityThreshold = 100; // Adjust this value based on asset price levels

  // Volatility filter for current symbol
  let atr = ctx.atr(14, 0);
  if (atr == null) return null;
  
  // Only proceed if the ATR is below the threshold (low volatility)
  if (atr > volatilityThreshold) return null;

  // Entry conditions based on Bollinger Bands crossing
  const bb = ctx.bb(20, 2, 0); // Current symbol's Bollinger Bands

  // Check for entry conditions in BTC or ETH
  if (ctx.sym === 'BTCUSDT' && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  if (ctx.sym === 'ETHUSDT' && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  
  // Exit conditions
  if (price < bb.lower) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action taken
  return null;
}
