/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy leverages the Relative Strength Index (RSI) to identify overbought and oversold conditions in the market. It aims to capitalize on mean reversion by entering trades when RSI crosses specific thresholds, expecting price to return to its mean.
 * When it buys and sells: Buys when RSI falls below 30 (oversold), and sells when RSI rises above 70 (overbought). The strategy uses a simple exit rule — closing positions when RSI crosses back the opposite threshold.
 * When it does NOT work: This strategy may not perform well in strong trending markets where prices continue to rise or fall without returning to mean levels, leading to frequent stop-outs and reduced profits.
 */

function onUpdate(ctx) {
  // Parameters for RSI
  const rsiLength = 14;
  const overboughtThreshold = 70;
  const oversoldThreshold = 30;

  // Retrieve RSI values
  const rsi = ctx.rsi(rsiLength);

  // Ensure sufficient data before making decisions
  if (rsi == null) return null;

  // Check position status
  const pos = ctx.position;

  // Buy condition: RSI crosses below oversold threshold
  if (rsi < oversoldThreshold && pos <= 0) {
    // Enter long position with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI crosses above overbought threshold
  if (rsi > overboughtThreshold && pos > 0) {
    // Close existing long position
    return { side: 'sell', qty: pos };
  }

  // No action
  return null;
}
