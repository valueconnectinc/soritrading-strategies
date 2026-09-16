/*
 * @coinsori-strategy v1
 * name: MACD Momentum Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy uses the MACD indicator as a momentum filter to avoid entering trades during periods of weak momentum. It combines a simple moving average crossover with MACD confirmation.
 * When it buys and sells: The strategy enters long when the price crosses above the SMA and the MACD histogram is positive, and exits when the MACD histogram turns negative.
 * When it does NOT work: This approach may fail in choppy markets where MACD signals are unreliable, or during strong trending periods where momentum filters prevent profitable entries.
 */
function onUpdate(ctx) {
  // Define parameters
  const smaPeriod = 20;
  const macdFast = 12;
  const macdSlow = 26;
  const macdSignal = 9;
  
  // Ensure we only execute logic on bar close
  if (!ctx.state.prevBar) {
    ctx.state.prevBar = ctx.i;
  } else if (ctx.state.prevBar === ctx.i) {
    return null;
  } else {
    ctx.state.prevBar = ctx.i;
  }
  
  // Fetch historical prices and calculate indicators
  const closes = ctx.closes;
  if (closes == null || closes.length < smaPeriod) return null;
  
  const sma = ctx.sma(smaPeriod);
  const price = ctx.price;
  
  // Guard against null values  
  if (sma == null || price == null) return null;
  
  // Calculate MACD
  const macd = ctx.macd(macdFast, macdSlow, macdSignal);
  
  // Guard against null values
  if (macd == null || macd.histogram == null) return null;

  // Entry condition: price crosses above SMA and MACD histogram is positive
  const prevClose = closes[closes.length - 2];
  const prevSma = ctx.sma(smaPeriod, 1);
  
  if (prevClose <= prevSma && price > sma && macd.histogram > 0) {
    const qty = ctx.cash / ctx.price * 0.99;
    return { side: 'buy', qty: qty };
  }
  
  // Exit condition: close position when MACD histogram turns negative
  if (ctx.position > 0 && macd.histogram < 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
