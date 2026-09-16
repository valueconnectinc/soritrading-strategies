/*
 * @coinsori-strategy v1
 * name: MA Crossover with Bollinger Band Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy combines moving average crossover with Bollinger Band mean reversion.
 * It enters long when fast MA crosses above slow MA and price is at or below lower BB band,
 * and exits when price crosses above upper BB band. The MACD trend filter helps avoid
 * entering during strong uptrends.
 *
 * When it buys: Enters long when MA crossover occurs and price is at/below lower BB band.
 * When it sells: Exits position when price crosses above upper BB band.
 * When it does NOT work: Fails in strong trending markets where mean reversion logic doesn't apply.
 */

function onUpdate(ctx) {
  // Moving averages
  const fastMA = ctx.sma(20);
  const slowMA = ctx.sma(50);
  
  // Bollinger Bands
  const bb = ctx.bb(20, 2);
  
  // MACD for trend filter
  const macd = ctx.macd(12, 26, 9);
  
  // Guard against null values
  if (fastMA == null || slowMA == null || bb == null || macd == null) return null;
  
  // Check for crossover (fast MA crossing above slow MA)
  const prevFastMA = ctx.sma(20, 1);
  const prevSlowMA = ctx.sma(50, 1);
  
  if (prevFastMA == null || prevSlowMA == null) return null;
  
  const crossover = prevFastMA <= prevSlowMA && fastMA > slowMA;
  
  // Trend filter: only enter if MACD signal is not strong bullish
  const macdSignal = macd.signal;
  if (macdSignal == null) return null;

  // Avoid entering during strong uptrend - use more lenient trend filter
  const trendFilter = macdSignal < 0.5; // MACD signal below 0.5 indicates bearish or neutral trend
  
  // Entry conditions: MA crossover + price at/below lower BB band + trend filter
  const entryCondition = crossover && (ctx.price <= bb.lower) && trendFilter;
  
  // Exit condition: price crosses above upper BB band
  const prevPrice = ctx.price;
  const currentPrice = ctx.price;
  
  if (prevPrice == null || currentPrice == null) return null;
  
  const exitCondition = prevPrice <= bb.upper && currentPrice > bb.upper;

  // Position handling
  if (ctx.position > 0 && exitCondition) {
    return { side: 'sell', qty: ctx.position }; // Close position
  }
  
  if (entryCondition && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 }; // Enter long with 95% cash
  }
  
  // Do nothing
  return null;
}
