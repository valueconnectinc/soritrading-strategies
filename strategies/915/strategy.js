/*
 * @coinsori-strategy v1
 * name: Simple MA Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Simple moving average crossover strategy without Bollinger Band.
 * It enters long when fast MA crosses above slow MA and exits when fast MA crosses below slow MA.
 *
 * When it buys: Enters long on MA crossover (fast MA crossing above slow MA).
 * When it sells: Exits position when MA crossover occurs again (fast MA crossing below slow MA).
 * When it does NOT work: Fails in strong trending markets where mean reversion logic doesn't apply.
 */

function onUpdate(ctx) {
  // Moving averages
  const fastMA = ctx.sma(20);
  const slowMA = ctx.sma(50);
  
  // Guard against null values
  if (fastMA == null || slowMA == null) return null;
  
  // Check for crossover (fast MA crossing above slow MA)
  const prevFastMA = ctx.sma(20, 1);
  const prevSlowMA = ctx.sma(50, 1);
  
  if (prevFastMA == null || prevSlowMA == null) return null;
  
  const crossover = prevFastMA <= prevSlowMA && fastMA > slowMA;
  
  // Check for crossunder (fast MA crossing below slow MA)
  const crossunder = prevFastMA >= prevSlowMA && fastMA < slowMA;
  
  // Position handling
  if (ctx.position > 0 && crossunder) {
    return { side: 'sell', qty: ctx.position }; // Close position
  }
  
  if (crossover && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 }; // Enter long with 95% cash
  }
  
  // Do nothing
  return null;
}
