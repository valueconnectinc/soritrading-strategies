/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT ADAUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy capitalizes on mean reversion across multiple assets,
 * where prices tend to revert to their historical averages after deviating significantly.
 * The volatility filter helps avoid trades during high volatility periods, which can lead
 * to large drawdowns.
 *
 * When it buys and sells: It buys when an asset's price is below its 20-period simple moving average
 * and the volatility (ATR) of that asset is below a threshold. It sells when the price crosses above
 * the SMA or when the volatility exceeds the threshold.
 *
 * When it does NOT work: This strategy may fail during strong trending markets where prices don't revert
 * to their mean, or during periods of very low volatility where the filter becomes too restrictive.
 */
function onUpdate(ctx) {
  // Define constants
  const smaLength = 20;
  const atrLength = 14;
  const volThreshold = 0.02; // 2% volatility threshold
  const positionSize = 0.3; // Allocate 30% of cash to each asset

  // Initialize variables for each symbol
  const symbols = ctx.syms;
  let orders = [];

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    
    // Switch context to the symbol
    ctx.sym = sym;

    // Calculate indicators
    const sma = ctx.sma(smaLength);
    const atr = ctx.atr(atrLength);
    const price = ctx.price;
    
    // Check for null values (warm-up period)
    if (sma == null || atr == null) return null;
    
    // Calculate current volatility as a percentage of price
    const volatility = atr / price;
    
    // Determine if we should enter a trade based on mean reversion and volatility
    const shouldBuy = (price < sma && volatility < volThreshold);
    const shouldSell = (price > sma || volatility >= volThreshold);

    // Position sizing logic: if we don't have any position, buy; if we do, sell out
    if (shouldBuy && ctx.position === 0) {
      // Buy when price is below SMA and volatility is low
      const qty = (ctx.cash * positionSize) / price;
      orders.push({ side: "buy", qty: qty });
    } else if (shouldSell && ctx.position > 0) {
      // Sell when price goes above SMA or volatility increases
      orders.push({ side: "sell", qty: ctx.position });
    }
  }

  // Return all orders
  return orders;
}
