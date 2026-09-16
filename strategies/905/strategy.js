/*
 * @coinsori-strategy v1
 * name: Momentum and Volume Filter Strategy
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses momentum indicators (such as MACD) combined with volume filters to confirm trade entries. It aims to identify strong moves by filtering out low-volume periods.
 * When it buys and sells: It goes long if the MACD shows a bullish signal and volume is above its average over the last 10 periods. Conversely, it shorts if MACD shows bearish signal and volume is above average.
 * When it does NOT work: This strategy might fail in low-volume or choppy markets where momentum indicators don't provide clear signals or volumes fluctuate frequently.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const macdLine = ctx.macd(12, 26, 9, 0);
  const signalLine = ctx.macd(12, 26, 9, 0)?.signal;
  
  if (macdLine == null || signalLine == null) return null;

  // Volume filter
  const avgVol = ctx.avgVol(10);
  if (avgVol == null) return null;
  
  const vol = ctx.vol;
  if (vol == null) return null;

  // Current position and price
  const position = ctx.position;
  const price = ctx.price;
  
  // Define trend based on MACD
  const isBullish = macdLine.macd > signalLine;
  
  // Enter long if bullish MACD and volume is above average
  if (position === 0 && isBullish && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Enter short if bearish MACD and volume is above average
  if (position === 0 && !isBullish && vol > avgVol) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Exit long position if price moves against the trend or falls below moving average
  if (position > 0 && (!isBullish || price < ctx.sma(20, 0))) {
    return { side: 'sell', qty: position }; 
  }

  // Exit short position if price moves against the trend or rises above moving average
  if (position < 0 && (isBullish || price > ctx.sma(20, 0))) {
    return { side: 'buy', qty: Math.abs(position) };
  }
  
  return null; // Do nothing
}
