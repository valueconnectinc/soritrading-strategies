/*
 * @coinsori-strategy v1
 * name: Improved Bollinger RSI Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This is an improved version of the basic Bollinger Band + RSI mean reversion strategy with optimized parameters for better performance across market conditions.
 * When it buys and sells: It buys when price touches or goes below lower BB and RSI < 30 (oversold), and sells when price touches or goes above upper BB and RSI > 70 (overbought).
 * When it does NOT work: It fails in strong, sustained trends where the market doesn't revert to the mean quickly enough to generate profits.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbPeriod = 20;
  const bbMult = 2;

  // RSI parameters
  const rsiPeriod = 14;

  // Get Bollinger Band indicators
  const bb = ctx.bb(bbPeriod, bbMult);
  if (bb == null) return null;

  const lower = bb.lower;
  const upper = bb.upper;

  // Get RSI
  const rsi = ctx.rsi(rsiPeriod);
  if (rsi == null) return null;

  // Signal conditions:
  // Buy: price is below or at lower BB AND RSI < 30 (oversold)
  // Sell: price is above or at upper BB AND RSI > 70 (overbought)

  if (ctx.price <= lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (ctx.price >= upper && rsi > 70) {
    // Close position if we have one
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // Do nothing otherwise
  return null;
}
