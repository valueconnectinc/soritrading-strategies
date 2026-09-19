/*
 * @coinsori-strategy v1
 * name: Bollinger RSI Mean Reversion
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: SUI is a high-volatility altcoin that frequently overshoots
 * below its value band and snaps back. Buying when price breaks below the lower
 * Bollinger Band and RSI confirms oversold conditions captures these mean-reversion bounces.
 * When it buys and sells: Buy when price closes below the lower BB band AND RSI(14) < 35
 * (double confirmation of oversold). Sell when price crosses back above the middle BB band
 * OR RSI rises above 65 (take-profit on mean reversion). No trailing stops — clean exit.
 * When it does NOT work: In strong sustained downtrends (SUI crashing for days) the bounce
 * never comes and the strategy accumulates small losses. Also fails in low-volatility chop.
 */

function onUpdate(ctx) {
  // Need enough bars for BB(20) + RSI(14)
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const price = ctx.price;
  const lowerBand = bb.lower;
  const midBand   = bb.mid;
  const upperBand = bb.upper;

  // === ENTRY: price below lower BB AND RSI oversold ===
  // Double filter: price overshoot + momentum oversold
  if (price < lowerBand && rsi < 35 && ctx.position === 0) {
    // Buy with 90% of available cash
    const qty = (ctx.cash * 0.90) / price;
    return { side: 'buy', qty: qty };
  }

  // === EXIT: price crosses back above middle BB OR RSI overbought ===
  // Close the position when mean is restored
  if (ctx.position > 0) {
    if (price > midBand || rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
