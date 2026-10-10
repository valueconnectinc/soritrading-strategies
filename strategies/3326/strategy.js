/*
 * @coinsori-strategy v1
 * name: BTC Fed Policy Regime 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bitcoin rallies when the Fed is cutting or holding rates (easy money) and suffers when the Fed is hiking. The policy direction is read from the user's own Fed funds rate data.
 * When it buys and sells: Buys BTC when the Fed funds rate is NOT higher than it was 90 days ago (not in a hiking cycle); sells when the rate starts rising or on a 12% stop.
 * When it does NOT work: The policy signal is slow — it exits about 3 months after hikes begin and can re-enter late; sudden liquidity-driven crashes can hit the stop before the Fed reacts.
 */

function onUpdate(ctx) {
  const fed = ctx.data('fed');
  const price = ctx.price;
  if (fed == null || price == null) return null;

  const st = ctx.state;
  const LOOKBACK = 540; // 90 days on 4h bars
  st.fedHist = st.fedHist || [];
  st.fedHist.push(fed);
  if (st.fedHist.length > LOOKBACK + 1) st.fedHist.shift();
  if (st.fedHist.length < LOOKBACK + 1) return null;

  const fedPrev = st.fedHist[0];  // fed funds rate 90 days ago
  const tightening = fed > fedPrev;

  const STOP = 0.12; // macro signal is slow; wide stop only for catastrophe

  if (ctx.position <= 0) {
    if (!tightening) {
      st.sinceEntry = 0;
      ctx.watch([{ side: 'sell', price: price * (1 - STOP), trigger: 'below', note: '12% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.8 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  st.sinceEntry = (st.sinceEntry || 0) + 1;

  ctx.watch([{ side: 'sell', price: entry * (1 - STOP), trigger: 'below', note: '12% stop' }]);

  if (tightening || price <= entry * (1 - STOP)) {
    st.sinceEntry = 0;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
