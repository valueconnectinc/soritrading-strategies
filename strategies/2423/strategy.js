/*
 * @coinsori-strategy v1
 * name: ETH Sentiment-Gated Trend 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Trends in crypto are strongest when they start from fear,
 *   not greed. Buying an uptrend while the crowd is still scared (Fear & Greed
 *   below the greed zone) catches the early, safer part of a move; entering when
 *   everyone is already greedy tends to buy a top. This overlays a sentiment
 *   filter on a simple trend-following rule.
 * When it buys and sells: Buy when ETH's 50-period EMA is above its 200-period
 *   EMA (uptrend) AND the Fear & Greed index is below the greed threshold (crowd
 *   is not yet euphoric). Sell when the uptrend breaks (fast EMA crosses below
 *   slow EMA).
 * When it does NOT work: In relentless melt-ups where greed stays high for months,
 *   the sentiment gate keeps it out of the biggest gains. In chop it whipsaws.
 *   Long-only, so it misses short-side profits in bears.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  if (fast == null || slow == null) return null;

  const fg = ctx.data('fear_greed'); // 0=extreme fear, 100=extreme greed
  if (fg == null) return null; // unknown sentiment = stay out

  const pos = ctx.position;

  // Exit: uptrend broken.
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: uptrend AND crowd not yet euphoric (avoid buying tops).
  const GREED_GATE = 70; // only enter while sentiment is below the greed zone
  if (fast > slow && fg < GREED_GATE) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
