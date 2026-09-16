/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion Improved
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This improved mean reversion strategy uses Bollinger Bands to identify overbought and oversold conditions. It incorporates a volatility filter to avoid trading during low activity periods, aiming for more reliable entry/exit points.
 * When it buys and sells: It buys when price touches the lower Bollinger Band (oversold) and sells when price touches the upper Bollinger Band (overbought), subject to volume conditions.
 * When it does NOT work: This strategy may underperform during strong trending markets where price stays consistently in overbought or oversold regions for extended periods, or during extremely high volatility periods.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2);  // 20-period BB with 2 std devs
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  
  // Guard against null values
  if (bb == null || avgVol == null || vol == null) {
    return null;
  }
  
  // Get current price and Bollinger Band values
  const price = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;
  const middleBand = bb.middle;
  
  // Volume filter: Only trade when volume exceeds twice the average volume
  const volumeFilter = vol > avgVol * 2;
  
  // Buy condition: Price touches the lower Bollinger Band (oversold)
  if (price <= lowerBand && volumeFilter) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: Price touches the upper Bollinger Band (overbought)
  if (price >= upperBand && volumeFilter) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
