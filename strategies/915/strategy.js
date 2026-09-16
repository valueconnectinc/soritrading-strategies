/*
 * @coinsori-strategy v1
 * name: Enhanced_BB_RSI_Mean_Reversion_Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This enhanced strategy adds a trend filter using MACD to avoid trading during strong trends. It combines Bollinger Band, RSI, and MACD to improve the mean reversion trade selection.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and RSI is below 30 (oversold), and MACD histogram is negative (bearish trend). It sells when price touches upper BB and RSI is above 70 (overbought) and MACD histogram is positive (bullish trend).
 * When it does NOT work: This strategy may fail in very choppy markets where trends are unclear, or where false signals from MACD occur.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20-period SMA and 2 std dev
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);

  // Guard against null values
  if (bb == null || rsi == null || macd == null) return null;

  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const middleBand = bb.middle;

  // Check if we are in a position to trade
  if (ctx.position === 0) {
    // Buy condition: price touches lower BB, RSI is below 30 (oversold), and MACD histogram is negative
    if (ctx.price <= lowerBand && rsi < 30 && macd.hist < 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else {
    // Sell condition: price touches upper BB, RSI is above 70 (overbought), and MACD histogram is positive
    if (ctx.price >= upperBand && rsi > 70 && macd.hist > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // No trade
  return null;
}
