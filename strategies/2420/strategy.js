/*
 * @coinsori-strategy v1
 * name: BTC FearGreed Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto trends hard on the daily timeframe, but buying every
 *   uptrend leg catches the top of speculative blow-offs. The fear/greed index
 *   tells us when the crowd is euphoric (late-stage tops) vs fearful.
 * When it buys and sells: Buy when price is above its long trend line AND the
 *   short trend has turned up (momentum), but only when the sentiment is not
 *   extreme-greed (avoid buying the top of a mania). Sell when the short trend
 *   turns back down.
 * When it does NOT work: In straight-line melt-ups where price never pulls back
 *   to give a fresh entry, it will be in cash and lag buy-and-hold. Extreme-greed
 *   filters can also keep it out of the very last leg of a rally.
 */
function onUpdate(ctx) {
  // Trend base: short vs long EMA crossover on the daily close.
  const fast = ctx.ema(20, 1);
  const slow = ctx.ema(100, 1);
  if (fast == null || slow == null) return null;

  // Fear/greed sentiment from the connected dataset (0-100).
  const fg = ctx.data('fg');
  const fgKnown = (fg != null);

  // Long-term trend gate: only trade when price is above the 200-day average.
  const lt = ctx.sma(200, 1);
  if (lt == null) return null;
  const price = ctx.closes[ctx.closes.length - 1];

  // Exit: short trend crossing back below the long trend.
  if (ctx.position > 0) {
    if (fast < slow) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Enter: short trend up + price above 200-day MA.
  if (fast > slow && price > lt) {
    // Skip entries when sentiment is extreme greed (>= 80) — late-stage mania.
    if (fgKnown && fg >= 80) return null;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
