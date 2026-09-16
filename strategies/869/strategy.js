/*
 * @coinsori-strategy v1
 * name: Multi-Indicator Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines multiple indicators to improve the reliability of mean reversion signals. It uses Bollinger Bands for price context, RSI for momentum confirmation, and volume filters to ensure trades occur during active market periods.
 * When it buys and sells: It buys when price touches the lower Bollinger Band and RSI is below 30 (confirming oversold), or when RSI dips below 30 without touching the band. It sells when price touches the upper Bollinger Band and RSI is above 70 (confirming overbought).
 * When it does NOT work: This strategy may underperform during strong trending markets, where price remains in overbought/oversold regions for extended periods, or during high volatility periods with low volume.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2);  // 20-period BB with 2 std devs
  const rsi = ctx.rsi(14);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  
  // Guard against null values
  if (bb == null || rsi == null || avgVol == null || vol == null) {
    return null;
  }
  
  // Get current price and Bollinger Band values
  const price = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;
  const middleBand = bb.middle;
  
  // Volume filter: Only trade when volume exceeds twice the average volume
  const volumeFilter = vol > avgVol * 2;
  
  // Buy condition: Price touches the lower Bollinger Band OR RSI is below 30
  const buyCondition1 = price <= lowerBand && volumeFilter;  // Price touch lower band
  const buyCondition2 = rsi < 30 && volumeFilter;            // RSI oversold
  
  if (buyCondition1 || buyCondition2) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: Price touches the upper Bollinger Band AND RSI is above 70
  const sellCondition = price >= upperBand && rsi > 70 && volumeFilter;
  
  if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
