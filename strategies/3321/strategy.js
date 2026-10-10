/*
 * @coinsori-strategy v1
 * name: BTC Funding Contrarian 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When the perpetual funding rate turns deeply negative, the crowd is paying to stay short — contrarian longs catch sharp bounces off extremes.
 * When it buys and sells: Buys BTC when funding drops to -0.03% or below (crowd bearish), sells back to cash when funding recovers to +0.01% or above, or on a 6% stop, or after 15 bars.
 * When it does NOT work: In sustained bear markets funding can stay negative for weeks while price keeps falling — the stop caps each loss but a long string of them bleeds the account.
 */

function onUpdate(ctx) {
  const f = ctx.funding;
  const price = ctx.price;
  if (f == null || price == null) return null;

  const st = ctx.state;
  const ENTRY_F = -0.0003; // funding at/below -0.03% per 8h: shorts pay longs => crowd bearish
  const EXIT_F = 0.0001;   // funding back to normal/positive: crowd neutral => take the bounce
  const STOP = 0.06;       // 6% hard stop caps a contrarian long that keeps falling
  const TIME_STOP = 15;    // 15 bars (2.5 days on 4h): give up if the bounce has not come

  if (ctx.position <= 0) {
    if (f <= ENTRY_F) {
      st.sinceEntry = 0;
      ctx.watch([{ side: 'sell', price: price * (1 - STOP), trigger: 'below', note: '6% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.8 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  st.sinceEntry = (st.sinceEntry || 0) + 1;

  ctx.watch([{ side: 'sell', price: entry * (1 - STOP), trigger: 'below', note: '6% stop' }]);

  if (f >= EXIT_F || price <= entry * (1 - STOP) || st.sinceEntry >= TIME_STOP) {
    st.sinceEntry = 0;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
