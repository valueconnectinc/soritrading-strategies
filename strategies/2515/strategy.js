/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian UpperBand Exit
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same panic-buy edge as the base Fear&Greed contrarian, but with
 * a different exit hypothesis — after a panic bottom the recovery often runs all the
 * way back to the UPPER Bollinger band, not just the middle. Selling at the middle
 * band may leave money on the table. This tests whether holding to the upper band
 * (with a trailing hard stop) captures more of the mean reversion.
 * When it buys: sentiment fearful (<40) AND price pierces the lower Bollinger band.
 * When it sells: price reaches the upper band, or a 10% hard stop is hit.
 * When it does NOT work: in a prolonged structural bear, fear stays extreme and price
 * keeps falling — the wider 10% stop bleeds more than the tighter 8% stop; the bounce
 * may never reach the upper band, leaving the trade open longer in a falling market.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.upper == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // 10% hard stop: wider than the base 8% to give panic bottoms room to dip
    // before snapping back; a too-tight stop gets shaken out at the worst moment.
    if (price <= ctx.entryPx * 0.90) return { side: 'sell', qty: pos };
    // hold until the upper band — the full mean-reversion target
    if (price >= bb.upper) return { side: 'sell', qty: pos };
    return null;
  }

  // fear threshold <40 with a lower-band pierce = panic bottom entry
  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
