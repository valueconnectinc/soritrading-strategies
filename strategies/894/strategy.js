/*
 * @coinsori-strategy v1
 * name: Volatility Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The strategy aims to capture trending markets while avoiding
 *   noisy or ranging conditions by using volatility as a filter. It uses ATR
 *   to define the volatility level and adjusts position size accordingly.
 *
 * When it buys and sells: Buys when price crosses above a moving average,
 *   and there's strong trend, and sell when the trend reverses or volatility
 *   drops below a threshold.
 *
 * When it does NOT work: This strategy may underperform in very choppy markets
 *   where volatility is consistently low, or during major news events that
 *   cause sudden spikes in volatility, leading to frequent stop-outs.
 */
function onUpdate(ctx) {
  const { price, position, cash } = ctx;

  // Calculate indicators
  const sma20 = ctx.sma(20);
  const sma50 = ctx.sma(50);
  const atr14 = ctx.atr(14);
  const volatilityThreshold = 0.02; // Reduced threshold to 2% for better sensitivity

  if (sma20 == null || sma50 == null || atr14 == null) return null;

  // Define trend based on moving averages
  const isTrendingUp = sma20 > sma50;
  const isTrendingDown = sma20 < sma50;

  // Calculate volatility filter
  const currentVolatility = atr14 / price;
  const isHighVolatility = currentVolatility > volatilityThreshold;

  // Buy condition: Price above SMA20, trending up, and high volatility
  if (price > sma20 && isTrendingUp && isHighVolatility && position === 0) {
    const qty = cash / price * 0.95; // Risk 5% of cash per trade
    return { side: 'buy', qty };
  }

  // Sell condition: Price below SMA20, trending down, and high volatility or position is open
  if ((price < sma20 && isTrendingDown && isHighVolatility) || (position > 0 && !isTrendingUp)) {
    return { side: 'sell', qty: position };
  }

  // No action if conditions are not met
  return null;
}
