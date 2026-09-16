/*
 * @coinsori-strategy v1
 * name: Mean Reversion Strategy with ATR Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy exploits mean reversion in Bitcoin price movements,
 *   using Bollinger Bands and ATR to identify overbought/oversold conditions while
 *   filtering out low-volatility periods that are unsuitable for mean reversion.
 *
 * When it buys and sells: Buys when the price touches the lower Bollinger Band
 *   and ATR indicates sufficient volatility. Sells when the price touches the upper
 *   Bollinger Band with adequate volatility.
 *
 * When it does NOT work: This strategy may underperform in strong trending markets,
 *   where price keeps moving in one direction without retracing to the mean. Also,
 *   during extremely volatile periods, large price movements can cause frequent
 *   false signals or whipsaws.
 */
function onUpdate(ctx) {
  const { price, position, cash } = ctx;

  // Calculate indicators
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20-period SMA and 2 standard deviations
  const atr14 = ctx.atr(14);

  if (bb == null || atr14 == null) return null;

  const upperBand = bb.upper;
  const lowerBand = bb.lower;
  const sma20 = bb.sma;

  // Define volatility threshold to filter low-volatility periods
  const volatilityFilter = 0.015; // 1.5% minimum volatility threshold

  // Calculate current volatility as ATR relative to price
  const currentVolatility = atr14 / price;

  // Buy condition: Price touches lower band with sufficient volatility
  if (price <= lowerBand && currentVolatility > volatilityFilter && position === 0) {
    const qty = cash / price * 0.95; // Risk 5% of cash per trade
    return { side: 'buy', qty };
  }

  // Sell condition: Price touches upper band with sufficient volatility or position is open
  if ((price >= upperBand && currentVolatility > volatilityFilter) || (position > 0 && price > sma20)) {
    return { side: 'sell', qty: position };
  }

  // No action if conditions are not met
  return null;
}
