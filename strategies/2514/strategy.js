/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian Mean Reversion (fear-scaled)
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bitcoin's most reliable historical edge is buying panic — when
 * crowd fear is at an extreme, prices tend to overshoot down and snap back. Fear &
 * Greed (ctx.data('fg')) is populated in this feed, so we confirm the crowd is
 * actually fearful rather than guessing from price alone.
 * When it buys: when sentiment is fearful (< 40) AND price pierces the lower
 * Bollinger band — a panic-bottom. Position size scales with how deep the fear is
 * (deeper fear = bigger bet on the bounce). Sells when price recovers to the middle
 * band or after a hard stop.
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

  // fear threshold <40: more entries than extreme-fear, still selective enough to
  // avoid the whipsaw that <50 caused on SOL W2 (which turned negative)
  if (fg < 40 && price < bb.lower) {
    // deeper fear = bigger position: scale 0.5x at fg=40 up to full 1.0x at fg<=10.
    // the bounce after a deeper panic is historically larger, so we bet more.
    const depth = Math.min(1, (40 - fg) / 30); // 0 at fg=40, 1 at fg=10
    const frac = 0.5 + 0.5 * depth;           // 0.5x .. 1.0x of cash
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }

  return null;
}
