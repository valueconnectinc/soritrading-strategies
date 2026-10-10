/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Adoption Trend 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's network usage (daily active addresses) leads its
 * price over months — adoption grows before price catches up, and users leave
 * before crashes. This is a fundamentally different signal source than price
 * indicators: it bets on network activity, not on candles.
 * When it buys and sells: Buys when active addresses are above their 30-day
 * average (network activity expanding) AND price is above a rising 200-day
 * average. Sells when address activity falls below its 30-day average, when the
 * 200-day average turns down, or on a 25% hard stop.
 * When it does NOT work: On-chain data is slow — it lags sharp price moves and
 * gives no edge in choppy flat ranges. It also fails if the BTC network metric
 * stops tracking price (regime change in what drives crypto prices).
 */
function onUpdate(ctx) {
  // On-chain signal: daily active addresses and its 30-day average (user dataset)
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  if (addr == null || addrSma == null || addrSma <= 0) return null; // dataset missing: do nothing

  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200_2 = ctx.sma(200, 2);
  if (sma200 == null || sma200_2 == null) return null;

  const pos = ctx.position;
  const entry = ctx.entryPx;

  if (pos > 0) {
    // exit: network weakening, trend breaking, or hard stop 25% below entry
    if (entry != null && price <= entry * 0.75) return { side: 'sell', qty: pos };
    if (addr < addrSma || sma200 < sma200_2) return { side: 'sell', qty: pos };
    ctx.watch([{ side: 'sell', price: entry * 0.75, trigger: 'below', note: 'hard stop 25%' },
               { side: 'sell', conds: [{ label: 'addr>30d avg', now: addr, op: '>', ref: addrSma, closed: true }] }]);
    return null;
  }

  // buy: adoption expanding AND uptrend intact (both conditions must hold)
  if (addr > addrSma && price > sma200 && sma200 > sma200_2) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  ctx.watch([{ side: 'buy', conds: [{ label: 'addr>30d avg', now: addr, op: '>', ref: addrSma, closed: true },
                                    { label: 'price>200SMA', ok: price > sma200 },
                                    { label: '200SMA rising', ok: sma200 > sma200_2 }] }]);
  return null;
}
