/*
 * @coinsori-strategy v1
 * name: BTC RSI Divergence Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy looks for bullish and bearish divergences between price and RSI.
 * It buys when a bullish divergence occurs (price makes lower lows but RSI makes higher lows).
 * It sells when a bearish divergence occurs (price makes higher highs but RSI makes lower highs).
 * The strategy avoids trading during strong trends to reduce false signals.
 *
 * When it buys: At the end of a downtrend where price and RSI form a bullish divergence pattern.
 * When it sells: At the end of an uptrend where price and RSI form a bearish divergence pattern.
 * When it does NOT work: When there are no clear divergences or during strong trending periods without correction.
 */

function onUpdate(ctx) {
  const rsiLength = 14;
  const rsi = ctx.rsi(rsiLength, 0);
  const prevRsi = ctx.rsi(rsiLength, 1);
  const prev2Rsi = ctx.rsi(rsiLength, 2);
  
  const price = ctx.price;
  const prevPrice = ctx.closes[1];
  const prev2Price = ctx.closes[2];

  // Make sure we have enough data
  if (rsi == null || prevRsi == null || prev2Rsi == null || 
      prevPrice == null || prev2Price == null) {
    return null;
  }

  // Check for bullish divergence
  const isBullishDivergence = (
    prevPrice < prev2Price && // Price makes lower low
    rsi > prevRsi &&          // RSI makes higher low (divergence)
    price < prevPrice         // Current price still below previous
  );

  // Check for bearish divergence
  const isBearishDivergence = (
    prevPrice > prev2Price && // Price makes higher high
    rsi < prevRsi &&          // RSI makes lower high (divergence)
    price > prevPrice         // Current price still above previous
  );

  // Avoid trading during strong trending periods
  const trendStrength = Math.abs(prevPrice - prev2Price) / prev2Price;
  const noTrend = trendStrength < 0.01; // Less than 1% change indicates trend absence

  if (isBullishDivergence && noTrend) {
    // Buy when bullish divergence occurs and no strong trend
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  
  if (isBearishDivergence && noTrend) {
    // Sell when bearish divergence occurs and no strong trend
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
