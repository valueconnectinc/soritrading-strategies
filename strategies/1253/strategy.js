/*
 * @coinsori-strategy v1
 * name: EMA Pullback Mean Reversion — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean-reversion on EMA pullbacks. Buy when price pulls back to or below
 * EMA 20 AND RSI(14) < 35 (deep pullback, not a reversal). Sell when price
 * recovers above EMA 20 (mean reversion complete) OR RSI reaches 65.
 * This is the OPPOSITE of trend-following: it fades short-term dips
 * within what should be a flat-to-slightly-up market.
 * Works in range-bound/choppy BTC. Fails in strong trends where "pullbacks"
 * are actually reversals and price keeps falling after entry.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  const ema20 = ctx.ema(20);
  if (ema20 == null) return null;

  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // === ENTRY: price at/below EMA + RSI deep pullback ===
  if (!position) {
    const atOrBelowEMA = price <= ema20;
    const deepPullback = rsi < 35;  // oversold, expecting bounce

    if (atOrBelowEMA && deepPullback) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: price recovers above EMA OR RSI normalizes ===
  if (position) {
    const recovered = price > ema20;
    const rsiNormal = rsi > 65;  // overbought = reversion done

    if (recovered || rsiNormal) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
