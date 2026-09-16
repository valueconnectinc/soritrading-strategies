/*
 * @coinsori-strategy v1
 * name: MACD Trend Filtered Bollinger RSI Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines Bollinger Bands with RSI for mean reversion signals, and adds a MACD trend filter to avoid entering during strong trends.
 * When it buys and sells: It buys when price is below lower BB and RSI < 30 (oversold), AND MACD is positive (bullish trend), and sells when price is above upper BB and RSI > 70 (overbought), AND MACD is negative (bearish trend).
 * When it does NOT work: It fails in extended strong trends where MACD doesn't change direction quickly enough to signal the exit, or when market conditions are too volatile.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbPeriod = 20;
  const bbMult = 2;

  // RSI parameters
  const rsiPeriod = 14;

  // MACD parameters
  const macdFast = 12;
  const macdSlow = 26;
  const macdSignal = 9;

  // Get Bollinger Band indicators
  const bb = ctx.bb(bbPeriod, bbMult);
  if (bb == null) return null;

  const lower = bb.lower;
  const upper = bb.upper;

  // Get RSI
  const rsi = ctx.rsi(rsiPeriod);
  if (rsi == null) return null;

  // Get MACD
  const macd = ctx.macd(macdFast, macdSlow, macdSignal);
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // Signal conditions:
  // Buy: price is below lower BB AND RSI < 30 AND MACD > Signal (bullish trend)
  // Sell: price is above upper BB AND RSI > 70 AND MACD < Signal (bearish trend)

  if (ctx.price < lower && rsi < 30 && macd.macd > macd.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (ctx.price > upper && rsi > 70 && macd.macd < macd.signal) {
    // Close position if we have one
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // Do nothing otherwise
  return null;
}
