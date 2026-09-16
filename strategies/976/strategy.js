/*
 * @coinsori-strategy v1
 * name: BBand Trend Filter Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines Bollinger Band mean reversion logic with a trend filter using the RSI. The intention is to reduce the risk of entering trades in strong trends, which could cause large drawdowns, while still capitalizing on mean-reverting price movements.
 * When it buys and sells: It buys when the price crosses below the lower Bollinger Band and the 14-period RSI is above a certain threshold (indicating a potential reversal after a downtrend), aiming to enter during mean-reverting dips. It sells (closes) a long position when the price crosses back above the middle Bollinger Band.
 * When it does NOT work: This strategy may underperform in very strong trends where the RSI doesn't generate reversal signals, or in highly volatile regimes where Bollinger Bands are wide and do not reflect true mean-reverting behavior.
 */
function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2, 0); // Bollinger Bands with 20-period length and 2 standard deviations
  const rsi = ctx.rsi(14, 0);
  const price = ctx.price;
  
  // Check if required data is available
  if (bb == null || rsi == null) return null;

  // Trend filter: If RSI is below 30, it is in a downtrend; only enter long positions when trend changes
  const isDowntrend = rsi < 30;
  const isUptrend = rsi > 70;
  
  // Check for mean reversion signal (price crosses below lower band)
  const isMeanReverting = price < bb.lower;

  // Exit condition: price crosses back above middle band
  const shouldExit = price > bb.middle;

  // Position size
  const positionSize = ctx.cash / ctx.price * 0.99; // Use 99% of cash

  // Buy condition with trend filter to avoid strong downtrends
  if (isMeanReverting && !isDowntrend && ctx.position <= 0) {
    return { side: 'buy', qty: positionSize };
  }

  // Sell/exit condition
  if (shouldExit && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing
  return null;
}
