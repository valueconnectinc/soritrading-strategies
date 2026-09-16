/*
 * @coinsori-strategy v1
 * name: Bollinger Band RSI Mean Reversion Improved
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses Bollinger Bands and RSI to detect mean reversion opportunities in BTCUSDT. It aims to capture short-term price reversals by combining volatility and momentum indicators.
 * When it buys and sells: The strategy enters long when the price crosses below the lower Bollinger Band and RSI is below 30 (oversold). It exits when price crosses above the middle band or when RSI exceeds 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trending markets where price moves consistently in one direction for extended periods, making mean reversion less likely.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20-period MA and 2 std devs
  const rsi = ctx.rsi(14);  // RSI with 14-period

  // Early exit if indicators are not ready
  if (bb == null || rsi == null) return null;

  // Get current price and position
  const price = ctx.price;
  const position = ctx.position;

  // If currently in a long position
  if (position > 0) {
    // Exit conditions:
    // 1. Price crosses above the middle Bollinger Band
    // 2. RSI exceeds 70 (overbought)
    const exitCondition1 = ctx.closes[1] <= bb.middle && price > bb.middle;
    const exitCondition2 = rsi > 70;

    if (exitCondition1 || exitCondition2) {
      return { side: 'sell', qty: position };
    }
  }

  // Entry condition:
  // - Price crosses below the lower Bollinger Band
  // - RSI is below 30 (oversold)
  // - Add a filter to ensure price is not too low (optional safety measure)
  const entryCondition1 = ctx.closes[1] >= bb.lower && price < bb.lower;
  const entryCondition2 = rsi < 30;

  if (entryCondition1 && entryCondition2) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // No trade
  return null;
}
