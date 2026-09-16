/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a simple moving average crossover to identify trend changes. It's a classic and widely used approach that works well in trending markets with sufficient volatility.
 * When it buys and sells: The strategy buys when the short-term MA crosses above the long-term MA, and sells when it crosses below.
 * When it does NOT work: This strategy is not effective in ranging or choppy markets where trends are weak or non-existent.
 */

function onUpdate(ctx) {
  // === INDICATORS ===
  const short = 10;
  const long = 20;
  
  const shortMA = ctx.sma(short, 0);
  const longMA = ctx.sma(long, 0);
  
  if (shortMA == null || longMA == null) return null;
  
  // === Crossover Conditions ===
  const shortMA_1 = ctx.sma(short, 1); // Previous short MA
  const longMA_1 = ctx.sma(long, 1);   // Previous long MA
  
  if (shortMA_1 == null || longMA_1 == null) return null;
  
  // Buy condition: Short MA crosses above Long MA
  if (shortMA > longMA && shortMA_1 <= longMA_1) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: Short MA crosses below Long MA
  if (shortMA < longMA && shortMA_1 >= longMA_1) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
