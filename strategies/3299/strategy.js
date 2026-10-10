/*
 * @coinsori-strategy v1
 * name: BTC Turtle Donchian 55/55 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC trends in sustained multi-month waves. The classic
 * turtle rule — enter on a 55-day high breakout, exit on a 55-day low — rides
 * those waves with a single, symmetric channel that avoids the whipsaw of a
 * tighter exit. A 200-day EMA trend filter keeps it out of bear-market rallies.
 * When it buys and sells: buys when price closes above the 55-day high while
 * price is above its 200-day EMA (no bear rallies). Sells when price closes
 * below the 55-day low. No take-profit — winners are let to run until the
 * channel flips. Stays in cash otherwise.
 * When it does NOT work: in a long choppy sideways market the 55-day channels
 * whipsaw and fees erode returns; in a straight-line melt-up it lags
 * buy-and-hold because every pullback below the 55-day low re-enters late.
 * A slow bear keeps it mostly in cash (small loss, no crash participation).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // Channels and trend filter on CLOSED bars (ago>=1 identical everywhere).
  const hh55 = ctx.high(55, 1);   // highest high of last 55 closed bars
  const ll55 = ctx.low(55, 1);    // lowest low of last 55 closed bars
  const ema200 = ctx.ema(200, 1);
  if (hh55 == null || ll55 == null || ema200 == null) { ctx.watch([]); return null; }

  const pos = ctx.pos(ctx.sym);

  // Exit: price closes below the 55-day low (channel flipped down).
  if (pos > 0) {
    if (price < ll55) {
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: ll55, trigger: 'below', note: '55d low exit' }]);
    return null;
  }

  // Entry: close above 55-day high AND above 200-day EMA (no bear rallies).
  if (price > hh55 && price > ema200) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) { ctx.watch([]); return null; }
    ctx.watch([]);
    return { side: 'buy', qty };
  }

  ctx.watch([{ side: 'buy', price: hh55, trigger: 'above', note: '55d breakout',
    conds: [{ label: 'price>55d high', ok: price > hh55, closed: true },
            { label: 'price>EMA200', ok: price > ema200, closed: true }] }]);
  return null;
}
