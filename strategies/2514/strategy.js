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
 * When it buys: when sentiment is fearful (< 50) AND price pierces the lower
 * Bollinger band — a panic-bottom. Sells when price recovers to the middle band
 * (mean reversion complete) or after a hard stop.
 * When it does NOT work: in a prolonged structural bear (fear stays extreme and price
 * keeps falling) the bounce is weak and the stop loss bleeds; also in quiet low-vol
 * regimes where the band is rarely touched. It is a mean-reversion bet, so it should
 * not be expected to ride sustained bull trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    if (price >= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  // fear threshold <50: even more entries, catches more bounces
  if (fg < 50 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
