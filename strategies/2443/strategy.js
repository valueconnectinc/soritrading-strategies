/*
 * @coinsori-strategy v1
 * name: ETH 1D RSI2 Capitulation Bounce
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different family — extreme-oversold bottom fishing.
 *   RSI(2) below a very low threshold marks short-term capitulation, after which price
 *   typically bounces even in a downtrend. This is a sharp, rare signal (not the loose
 *   RSI<40 pullback that just failed). Different from both breakout and trend following.
 * When it buys and sells: Buy when RSI(2) drops below 8 (capitulation). Sell when RSI(2)
 *   climbs back above 50 (bounce exhausted) or after 10 bars.
 * When it does NOT work: In a sustained bear market a capitulation bounce can be a
 *   dead-cat bounce that keeps falling — I cap the holding period and take the small
 *   bounce rather than riding it down. Long-only.
 */
function onUpdate(ctx) {
  const rsi2 = ctx.rsi(2, 1);
  if (rsi2 == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    // exit: bounce exhausted, or timeout after 10 bars
    if (rsi2 > 50 || ctx.state.holdBars >= 10) {
      return { side: 'sell', qty: pos };
    }
    if (ctx.state.holdBars == null) ctx.state.holdBars = 0;
    ctx.state.holdBars = (ctx.state.holdBars || 0) + 1;
    return null;
  }
  // entry: extreme capitulation
  if (rsi2 < 8) {
    ctx.state.holdBars = 0;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
