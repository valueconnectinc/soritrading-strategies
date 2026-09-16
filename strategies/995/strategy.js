/*
 * @coinsori-strategy v1
 * name: Enhanced Bollinger Band + RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines mean reversion from Bollinger Bands with momentum confirmation from RSI to reduce exposure to false signals. The additional RSI filter helps identify overbought/oversold conditions, improving timing.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and RSI is below 30 (oversold), or if RSI is between 30 and 50 but shows bullish momentum. It sells when the price touches the upper Bollinger Band and RSI is above 70 (overbought) or shows bearish momentum.
 * When it does NOT work: It fails during strong trending periods where prices remain in extended overbought or oversold regions for long durations, making the mean reversion signals ineffective.
 */

function onUpdate(ctx) {
  // --- Input Parameters ---
  const bbPeriod = 20;
  const bbMultiplier = 2.0;
  const rsiPeriod = 14;

  // === Bollinger Band Calculation ===
  const bb = ctx.bb(bbPeriod, bbMultiplier);
  if (bb == null) return null;
  
  const bbUpper = bb.upper;
  const bbLower = bb.lower;
  const bbMiddle = bb.middle;

  // === RSI Calculation ===
  const rsi = ctx.rsi(rsiPeriod, 1);
  const rsiPrev = ctx.rsi(rsiPeriod, 2);
  
  if (rsi == null || rsiPrev == null) return null;

  // --- Signal Conditions ---
  const price = ctx.price;
  
  // Buy condition: Price touches lower BB with RSI oversold or bullish momentum
  const buyCondition = (price <= bbLower && rsi < 30) || 
                       (price <= bbLower && rsi > rsiPrev && rsi >= 30 && rsi <= 50);

  // Sell condition: Price touches upper BB with RSI overbought or bearish momentum
  const sellCondition = (price >= bbUpper && rsi > 70) || 
                        (price >= bbUpper && rsi < rsiPrev && rsi >= 50 && rsi <= 70);
  
  // === Trade Execution ===
  if (buyCondition && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
