/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Network Regime
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price tracks real network usage. When the number of active addresses moving coins each day is above its 90-day average, the network is in an expansion phase and the market tends to rise; when it falls below, the network is contracting.
 * When it buys and sells: Buys BTC when daily active addresses are above their 90-day average; sells everything when they drop below it, or on a 20% stop-loss for sudden crashes.
 * When it does NOT work: The signal is slow and coincident — it can exit late in fast crashes and miss the early part of recoveries. Since 2024 price has been partly driven by ETF/institutional flows that do not show up in on-chain addresses, so it can miss rallies like those.
 */

function onUpdate(ctx) {
  const addr = ctx.data('addr');
  const price = ctx.price;
  if (addr == null || price == null) return null;

  const st = ctx.state;
  const LOOKBACK = 90; // 90-day trailing average of active addresses
  st.addrHist = st.addrHist || [];
  st.addrHist.push(addr);
  if (st.addrHist.length > LOOKBACK + 1) st.addrHist.shift();
  if (st.addrHist.length < LOOKBACK + 1) return null;

  let sum = 0;
  for (let i = 0; i < LOOKBACK; i++) sum += st.addrHist[i];
  const avg = sum / LOOKBACK;
  const growing = addr > avg;

  const STOP = 0.20; // on-chain signal is slow; wide stop only for catastrophe

  if (ctx.position <= 0) {
    if (growing) {
      ctx.watch([{ side: 'sell', price: price * (1 - STOP), trigger: 'below', note: '20% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  ctx.watch([{ side: 'sell', price: entry * (1 - STOP), trigger: 'below', note: '20% stop' }]);

  if (!growing || price <= entry * (1 - STOP)) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
