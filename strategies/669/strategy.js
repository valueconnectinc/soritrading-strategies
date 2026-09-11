/*
 * @coinsori-strategy v1
 * name: Trend Filtered Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines mean reversion with a trend filter to avoid trading during strong trending periods. It uses the 50-period EMA to determine the trend direction and only applies the mean reversion logic when the trend is flat or slightly trending.
 * When it buys and sells: It buys when the price crosses below the moving average plus a dynamic threshold, and sells when the price crosses above the moving average minus the threshold, but only if the trend is not strong.
 * When it does NOT work: This strategy fails in very strong trending markets where mean reversion is not applicable. In such cases, the strategy avoids trading, leading to missed opportunities or lower returns.
 */
function onUpdate(ctx) {
  // Moving average period for mean reversion
  const maPeriod = 20;
  // ATR period for volatility measurement
  const atrPeriod = 14;
  // EMA period for trend filtering
  const emaPeriod = 50;
  
  // Get indicators
  const ma = ctx.sma(maPeriod);
  const atr = ctx.atr(atrPeriod);
  const ema = ctx.ema(emaPeriod);
  
  // Guard against null values (warm-up period)
  if (ma == null || atr == null || ema == null) return null;

  // Calculate dynamic threshold based on ATR
  const threshold = atr * 1.5; // Multiplier can be tuned

  // Current price and moving average
  const price = ctx.price;
  
  // Trend filter: if price is above EMA, it's trending up; if below, down
  const trendUp = price > ema;
  const trendDown = price < ema;
  
  // Only trade if the trend is not strong (flat or slightly trending)
  // Here, we allow trading when price is within 1% of EMA (can be adjusted)
  const trendStrength = Math.abs((price - ema) / ema);
  const allowTrade = trendStrength < 0.01;
  
  // Buy condition: price crosses below (MA + threshold), and trend allows trade
  if (price < ma - threshold && allowTrade) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell condition: price crosses above (MA - threshold), and trend allows trade
  if (price > ma + threshold && allowTrade) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No action
  return null;
}
