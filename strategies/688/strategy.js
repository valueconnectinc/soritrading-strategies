/*
 * @coinsori-strategy v1
 * name: Multi-Asset MACD RSI with External Macro Indicator
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses MACD and RSI on multiple assets (BTC and ETH) to detect trend changes and momentum. It also incorporates an external macro indicator (Fear and Greed Index) to adjust the strategy's risk exposure based on overall market sentiment.
 * When it buys and sells: When MACD and RSI both indicate a bullish trend on at least one of the assets, and the Fear and Greed index is in the 'Greed' or 'Extreme Greed' zone, the strategy goes long. Conversely, it sells when trends are bearish or the Fear and Greed index indicates fear.
 * When it does NOT work: The strategy may underperform during periods of low volatility or when external macro indicators fail to predict significant market shifts. Additionally, it might not respond well to sudden news events that contradict the macro sentiment or trend signals.
 */
function onUpdate(ctx) {
  // Load macro indicator data
  const fearGreed = ctx.data('fg');

  // Define thresholds for Fear and Greed index
  const greedThreshold = 60;   // Indicates Greed
  const fearThreshold = 40;    // Indicates Fear

  // Initialize order array
  let orders = [];

  // Loop through each symbol
  for (let i = 0; i < ctx.syms.length; i++) {
    const sym = ctx.syms[i];
    
    // Switch to the symbol context
    if (sym !== ctx.sym) ctx.sym = sym;
    
    // Calculate MACD and RSI indicators
    const macd = ctx.macd(12, 26, 9, 0);
    const rsi = ctx.rsi(14, 0);

    // Ensure we have valid values for MACD and RSI
    if (macd == null || rsi == null) continue;

    // Define bullish conditions for MACD and RSI
    const isBullishMACD = macd.macd > macd.signal;
    const isBullishRSI = rsi > 50;

    // If the symbol is BTCUSDT or ETHUSDT, we can enter trades
    if (sym === 'BTCUSDT' || sym === 'ETHUSDT') {
      // Check if fear/greed index supports bullish sentiment and signals are bullish
      if (fearGreed != null && fearGreed >= greedThreshold) {
        // Enter long position if MACD and RSI both indicate strength
        if (isBullishMACD && isBullishRSI) {
          orders.push({ side: 'buy', qty: ctx.cash / ctx.price * 0.95 });
        } else if (!isBullishMACD || !isBullishRSI) {
          // Close position if not bullish
          orders.push({ side: 'sell', qty: ctx.position });
        }
      } else {
        // If fear dominates, close any existing positions or avoid entering
        orders.push({ side: 'sell', qty: ctx.position });
      }
    }
  }

  // Reset symbol context to original
  if (ctx.syms.length > 0) ctx.sym = ctx.syms[0];

  // Return the orders
  return orders.length > 0 ? orders : null;
}
