/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Adoption Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's on-chain activity (active addresses) measures real
 * network usage. A growing network tends to accompany sustained price appreciation,
 * because more users transacting = more genuine adoption, not just speculation.
 * This is a different signal from price/volume and can ride adoption-driven melt-ups
 * that pure price trend-following misses.
 * When it buys and sells: Buys when active addresses are expanding (above their
 * 30-day average by a margin) AND price is above its 200-day average. Holds while
 * the network keeps growing, and sells when active addresses contract (network
 * health deteriorates) or price breaks below the 200-day average.
 * When it does NOT work: It is slow and misses fast speculative melt-ups driven by
 * leverage rather than usage. It needs the external address data — if missing it
 * stays in cash. It can be late on sharp reversals that happen before on-chain
 * activity turns.
 */
function onUpdate(ctx) {
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  if (addr == null || addrSma == null || addrSma <= 0) return null;

  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (!Number.isFinite(price) || price <= 0 || sma200 == null) return null;

  // Network expanding: active addresses 2% above their 30-day average.
  // 2% margin filters daily noise around the mean (avoids whipsaw).
  const expanding = addr > addrSma * 1.02;
  // Network contracting: active addresses 2% below their 30-day average.
  const contracting = addr < addrSma * 0.98;

  if (ctx.position <= 0) {
    // Buy only in an established uptrend (price above 200-day) with a growing
    // network — captures adoption-driven bull legs, avoids falling knives.
    if (expanding && price > sma200) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // Exit when network health deteriorates or the uptrend breaks.
  if (contracting || price < sma200) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
