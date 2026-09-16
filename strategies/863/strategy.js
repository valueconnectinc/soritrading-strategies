/*
 * @coinsori-strategy v1
 * name: BTC RSI Divergence Strategy Enhanced
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This is an enhanced version of the RSI divergence strategy.
 * It adds a filter for volatility to avoid trading during high volatility periods.
 * It also modifies the divergence detection to be more robust by checking multiple bars.
 * The strategy buys when a bullish divergence occurs and volatility is low.
 * It sells when a bearish divergence occurs and volatility is low.
 *
 * When it buys: At the end of a downtrend where price and RSI form a bullish divergence pattern with low volatility.
 * When it sells: At the end of an uptrend where price and RSI form a bearish divergence pattern with low volatility.
 * When it does NOT work: During high volatility periods or when there are no clear divergence patterns.
 */

function onUpdate(ctx) {
  const rsiLength = 14;
  const rsi = ctx.rsi(rsiLength, 0);
  const prevRsi = ctx.rsi(rsiLength, 1);
  const prev2Rsi = ctx.rsi(rsiLength, 2);
  const prev3Rsi = ctx.rsi(rsiLength, 3);
  
  const price = ctx.price;
  const prevPrice = ctx.closes[1];
  const prev2Price = ctx.closes[2];
  const prev3Price = ctx.closes[3];

  // Make sure we have enough data
  if (rsi == null || prevRsi == null || prev2Rsi == null || prev3Rsi == null ||
      prevPrice == null || prev2Price == null || prev3Price == null) {
    return null;
  }

  // Calculate volatility using ATR
  const atr = ctx.atr(14, 0);
  const prevAtr = ctx.atr(14, 1);
  
  if (atr == null || prevAtr == null) {
    return null;
  }
  
  // Volatility filter - only trade when ATR is low (less than previous bar's ATR)
  const lowVolatility = atr < prevAtr;

  // Check for bullish divergence over 3 bars
  const isBullishDivergence = (
    prevPrice < prev2Price &&     // Price makes lower low  
    prev2Price < prev3Price &&    // Price continues to make lower lows
    rsi > prevRsi &&              // RSI makes higher low (divergence)
    prevRsi > prev2Rsi &&         // RSI continues to make higher lows
    price < prevPrice             // Current price still below previous
  );

  // Check for bearish divergence over 3 bars
  const isBearishDivergence = (
    prevPrice > prev2Price &&     // Price makes higher high
    prev2Price > prev3Price &&    // Price continues to make higher highs
    rsi < prevRsi &&              // RSI makes lower high (divergence)
    prevRsi < prev2Rsi &&         // RSI continues to make lower highs
    price > prevPrice             // Current price still above previous
  );

  if (isBullishDivergence && lowVolatility) {
    // Buy when bullish divergence occurs and volatility is low
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  
  if (isBearishDivergence && lowVolatility) {
    // Sell when bearish divergence occurs and volatility is low
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
