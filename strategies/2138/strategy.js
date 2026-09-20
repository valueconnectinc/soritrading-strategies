/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Crypto Fear & Greed index measures crowd emotion.
 * Extremes are mean-reverting — panic (very low) tends to mark bottoms and
 * euphoria (very high) tends to mark tops. This strategy fades those extremes.
 * When it buys and sells: buys when the index is deeply fearful (<= 25) and
 * sells when it turns greedy again (>= 55). It stays in cash in the middle.
 * When it does NOT work: in strong sustained trends the index can stay
 * extreme for a long time, so waiting for a pullback to "normal" can make us
 * buy too early in a falling knife or exit too early in a melt-up.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;
  const pos = ctx.position;

  if (pos <= 0) {
    // Deep fear = crowd panic = contrarian buy signal.
    if (fg <= 25) {
      const qty = (ctx.cash / ctx.price) * 0.98;
      if (qty <= 0) return null;
      return { side: 'buy', qty };
    }
    return null;
  } else {
    // Greed returns = crowd euphoria = take profit.
    if (fg >= 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
