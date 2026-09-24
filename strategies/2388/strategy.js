/*
 * @coinsori-strategy v1
 * name: BTC Band-Bounce Mean Reversion 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price mean-reverts — sharp drops to the lower Bollinger band
 * with an oversold RSI are capitulation events that usually bounce back toward the average.
 * This is the opposite family from trend-following: it buys weakness and sells strength.
 * When it buys and sells: Buy when the last closed price touches the lower Bollinger band
 * (20,2) AND RSI(14) is oversold (<30). Sell when price reaches the upper band or RSI turns
 * overbought (>70).
 * When it does NOT work: In a genuine bear-market breakdown, "cheap" keeps getting cheaper
 * and the bounce never comes — this strategy keeps buying falling knives and can hold a deep
 * drawdown. It also sits flat (in cash) for long stretches during strong one-way trends,
 * missing the rally entirely.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (px == null || bb == null || rsi == null || bb.lower == null || bb.upper == null) return null;

  const pos = ctx.position;
  const lower = bb.lower;
  const upper = bb.upper;

  if (pos === 0) {
    // Buy capitulation: price at/below the lower band AND oversold.
    if (px <= lower && rsi < 30 && ctx.price > 0) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit the bounce: price back at the upper band or RSI overbought.
  if (px >= upper || rsi > 70) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
