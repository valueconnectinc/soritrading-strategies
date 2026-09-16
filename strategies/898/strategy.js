/*
 * @coinsori-strategy v1
 * name: Enhanced Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The strategy enhances the previous mean reversion approach by incorporating an additional volatility filter based on RSI. This is intended to reduce false signals during high-volatility periods, aiming for better risk-adjusted returns.
 * When it buys and sells: Buys when price crosses below a defined threshold (based on moving average and ATR) and RSI is below 30, indicating oversold conditions. Sells when price crosses above the threshold and RSI is above 70, signaling overbought conditions.
 * When it does NOT work: This strategy may fail in markets with consistently low volatility (where RSI remains stable), or in strong trending environments where the mean-reversion assumption breaks down.
 */

function onUpdate(ctx) {
  // Get indicators
  const price = ctx.price;
  const sma = ctx.sma(20); // 20-period SMA
  const atr = ctx.atr(14); // 14-period ATR
  const rsi = ctx.rsi(14); // 14-period RSI
  
  // Guard against null values
  if (sma == null || atr == null || rsi == null) return null;

  // Calculate the thresholds for mean reversion based on ATR
  const upperThreshold = sma + atr * 1.5;
  const lowerThreshold = sma - atr * 1.5;

  // Additional volatility filter using RSI
  const oversoldLevel = 30;
  const overboughtLevel = 70;

  // Check if we are in a position to trade
  if (ctx.position === 0) {
    // Enter long when price drops below lower threshold and RSI is oversold
    if (price < lowerThreshold && rsi < oversoldLevel) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else if (ctx.position > 0) {
    // Exit position if price crosses upper threshold and RSI is overbought
    if (price > upperThreshold && rsi > overboughtLevel) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null; // Do nothing if no conditions are met
}
