/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian Mean Reversion
 * ex: binance
 * syms: BTCUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bitcoin's most reliable historical edge is buying panic — when
 * crowd fear is at an extreme, prices tend to overshoot down and snap back. Fear &
 * Greed (ctx.data('fg')) is populated in this feed, so we can confirm the crowd is
 * actually fearful rather than guessing from price alone.
 * When it buys: when sentiment is at extreme fear (< 25) AND price pierces the lower
 * Bollinger band — a genuine panic-bottom. Sells when price recovers to the upper
 * band, or on a trailing stop / hard stop, to capture more of the bounce.
 * When it does NOT work: in a prolonged structural bear (fear stays extreme and price
 * keeps falling) the bounce is weak and the stop loss bleeds; also in quiet low-vol
 * regimes where the band is rarely touched. It is a mean-reversion bet, so it should
 * not be expected to ride sustained bull trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.upper == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // hard stop: panic can keep falling in a real crash -> cap the loss at 8%
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    // trailing stop: protect gains once the bounce is underway (lock in 15% from peak)
    const peak = ctx.state.peak || ctx.entryPx;
    const newPeak = price > peak ? price : peak;
    ctx.state.peak = newPeak;
    if (price <= newPeak * 0.85) return { side: 'sell', qty: pos };
    // take profit: mean reversion complete at the upper band
    if (price >= bb.upper) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: extreme fear + panic price below lower band
  if (fg < 25 && price < bb.lower) {
    ctx.state.peak = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
