/*
 * @coinsori-strategy v1
 * name: ETH 4H Trend FearGreed
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends hard, and the daily-trend champion
 *   (EMA 20/100 crossover + fear/greed filter) is validated on BTC and ETH 1D.
 *   This ports the same proven recipe to the 4h timeframe, which reacts faster
 *   to regime changes while still filtering out the noisiest intraday chop.
 * When it buys and sells: Buy when the 20-bar average is above the 100-bar
 *   average (uptrend) and price is above its 200-bar long-term average, but
 *   skip entries when sentiment is extreme greed (>= 80, a late-stage top).
 *   Sell when the short trend crosses back below the long trend.
 * When it does NOT work: In straight-line melt-ups with no pullback it sits in
 *   cash and lags buy-and-hold. The extreme-greed filter can miss the last leg
 *   of a rally. It is long-only, so it does not profit from shorting bears.
 */
function onUpdate(ctx) {
  // Trend base: short vs long EMA crossover on the 4h close (closed bars).
  const fast = ctx.ema(20, 1);
  const slow = ctx.ema(100, 1);
  if (fast == null || slow == null) return null;

  // Long-term gate: only trade above the 200-bar average.
  const lt = ctx.sma(200, 1);
  if (lt == null) return null;
  const price = ctx.closes[ctx.closes.length - 1];

  // Fear/greed sentiment from the connected dataset (0-100).
  const fg = ctx.data('fear_greed');
  const fgKnown = (fg != null);

  // Exit: short trend crossing back below the long trend.
  if (ctx.position > 0) {
    if (fast < slow) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Enter: short trend up + price above the 200-bar average.
  if (fast > slow && price > lt) {
    // Skip entries at extreme greed (>=80) — buying the top of a mania.
    if (fgKnown && fg >= 80) return null;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
