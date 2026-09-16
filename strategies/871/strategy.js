/*
 * @coinsori-strategy v1
 * name: Volume-Weighted Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy combines volume and mean reversion to identify high-confidence entry points. It looks for price movements that occur in conjunction with unusually high trading volumes, which often signal a strong reversal.
 * When it buys and sells: The strategy enters long positions when the price crosses below the 20-period SMA, and volume is above the average.
 * When it does NOT work: This approach may fail during strong trending markets where volumes remain consistently high and price moves in a single direction for extended periods, potentially leading to false signals.
 */
function onUpdate(ctx) {
  // Define parameters
  const smaPeriod = 20;
  const volumeThreshold = 1.5; // Multiplier for average volume
  
  // Ensure we only execute logic on bar close
  if (!ctx.state.prevBar) {
    ctx.state.prevBar = ctx.i;
  } else if (ctx.state.prevBar === ctx.i) {
    return null;
  } else {
    ctx.state.prevBar = ctx.i;
  }
  
  // Fetch historical prices and calculate SMAs
  const closes = ctx.closes;
  if (closes == null || closes.length < smaPeriod) return null;
  
  const sma = ctx.sma(smaPeriod);
  const price = ctx.price;
  const volume = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Guard against null values  
  if (sma == null || price == null || volume == null || avgVol == null) return null;
  
  // Entry condition: price crosses below SMA and volume is above average
  const prevClose = closes[closes.length - 2];
  const prevSma = ctx.sma(smaPeriod, 1);
  if (prevClose >= prevSma && price < sma && volume > avgVol * volumeThreshold) {
    const qty = ctx.cash / ctx.price * 0.99;
    return { side: 'buy', qty: qty };
  }
  
  // Exit condition: close position when price crosses back above SMA
  if (ctx.position > 0 && price > sma) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
