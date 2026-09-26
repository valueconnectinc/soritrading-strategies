/*
 * @coinsori-strategy v1
 * name: Fear-Greed Extreme-Fear Buy BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different sentiment family — buy BTC when the
 * fear-greed index hits extreme fear (a capitulation bottom), sell when fear
 * recovers to neutral. Uses the user's real daily fear-greed dataset. This is
 * contrarian: the crowd is most bearish exactly at local bottoms.
 * When it buys and sells: buys when fear-greed < 20 (extreme fear) while price
 * is above the 200-day SMA (avoid buying into a confirmed long bear). Sells
 * when fear-greed recovers above 55 (neutral) or after a 6-ATR stop.
 * When it does NOT work: in a sustained bear market price keeps falling after
 * each fear spike and the 200-SMA gate keeps it out (good), but it also misses
 * the strongest melt-ups that happen from neutral-to-greedy states. Regime-
 * dependent: strongest in volatile/choppy markets.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // no sentiment data -> stay out, UNKNOWN not 0

  if (pos > 0) {
    // Exit when fear recovers to neutral, or on a 6-ATR stop.
    if (fg > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null; // avoid buying into a confirmed long bear

  // Extreme fear = capitulation bottom candidate.
  if (fg < 20) {
    ctx.state.lastExit = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
