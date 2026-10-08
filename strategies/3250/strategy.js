/*
 * @coinsori-strategy v1
 * name: BTC 4H Liquidation Capitulation Contrarian
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Long-liquidation cascades mark short-term capitulation; price tends to revert
 * after the flush. We buy the flush on a dip and exit back to the mean.
 * When it buys and sells: Buy when a big long-liquidation spike happens while price is below its
 * 50-EMA (a dip). Sell when price returns to the 20-EMA or hits a 3xATR stop.
 * When it does NOT work: In sustained bear trends "capitulation" keeps happening — repeated buying
 * bleeds. Also quiet low-volatility markets produce no signals so it sits in cash.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const st = ctx.state;
  const raw = ctx.binanceLiqs(4);
  if (st && !st.logged && raw != null) {
    st.logged = true;
    ctx.log('liqs raw sample:', Array.isArray(raw) ? JSON.stringify(raw.slice(0, 3)) : String(raw), 'typeof', typeof raw);
  }
  if (raw == null) return null;

  let liqSum = 0;
  if (Array.isArray(raw)) {
    for (const r of raw) {
      if (typeof r === 'number') liqSum += r;
      else if (r && typeof r.value === 'number') liqSum += r.value;
      else if (r && typeof r.qty === 'number') liqSum += r.qty;
    }
  } else if (typeof raw === 'number') {
    liqSum = raw;
  } else {
    return null;
  }

  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || atr == null) return null;

  if (st.liqEma == null) st.liqEma = liqSum;
  else st.liqEma = st.liqEma * 0.95 + liqSum * 0.05;
  const spike = st.liqEma > 0 && liqSum > 3 * st.liqEma;

  if (ctx.position > 0) {
    const stopPx = ctx.entryPx - 3 * atr;
    ctx.watch([
      { side: 'sell', price: ema20, note: 'revert to EMA20' },
      { side: 'sell', price: stopPx, note: '3xATR stop' }
    ]);
    if (px < stopPx || px >= ema20) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (!spike) return null;
  if (liqSum <= 0) return null;
  if (px >= ema50) return null;

  const qty = (ctx.cash / px) * 0.99;
  return { side: 'buy', qty };
}
