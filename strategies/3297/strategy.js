/*
 * @coinsori-strategy v1
 * name: ETH Donchian Breakout Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto trends in sustained multi-month waves. A Donchian
 * breakout — price closing above the highest high of the last 55 days — marks
 * the start of a fresh up-leg, and riding it until a 30-day low breaks captures
 * most of the move. This is a trend-following edge, the opposite family of the
 * mean-reversion champion.
 * When it buys and sells: buys when price closes above the 55-day high AND the
 * 200-day average is RISING (a falling average means the market is still in a
 * downtrend and breakouts fail there). Sells when price closes below the 30-day
 * low, or a 3-ATR hard stop is hit. Stays in cash otherwise.
 * When it does NOT work: in a long choppy sideways market the breakouts whipsaw
 * and fees erode returns. In a slow bear it stays mostly in cash so it avoids
 * most of the drop but misses the eventual bottom. A failed breakout that
 * reverses hard hits the stop.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // Donchian channels on CLOSED bars (ago>=1 identical in backtest/paper/live).
  const hh55 = ctx.high(55, 1);   // highest high of last 55 closed bars
  const ll30 = ctx.low(30, 1);    // lowest low of last 30 closed bars
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (hh55 == null || ll30 == null || sma200 == null || sma200prev == null) { ctx.watch([]); return null; }
  const trendOk = sma200 > sma200prev;

  const pos = ctx.pos(ctx.sym);

  // Exit: broke below 30-day low, or 3-ATR hard stop below entry.
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    const stopPx = atr != null ? ctx.entryPx - 3 * atr : 0;
    if (price < ll30 || (stopPx > 0 && price < stopPx)) {
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: ll30, trigger: 'below', note: '30d low exit' },
               { side: 'sell', price: stopPx, trigger: 'below', note: '3 ATR stop' }]);
    return null;
  }

  // Entry: close above 55-day high AND 200-SMA rising (no bear-rally buys).
  if (price > hh55 && price > sma200 && trendOk) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) { ctx.watch([]); return null; }
    ctx.watch([]);
    return { side: 'buy', qty };
  }

  ctx.watch([{ side: 'buy', price: hh55, trigger: 'above', note: '55d breakout',
    conds: [{ label: 'price>55d high', ok: price > hh55, closed: true },
            { label: 'SMA200 rising', ok: trendOk, closed: true }] }]);
  return null;
}
