/*
 * @coinsori-strategy v1
 * name: On-Chain Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The number of active Bitcoin addresses is a measure of
 * real network usage and demand. When it is rising, buyers are coming into
 * the network and price tends to follow; when it falls, demand is leaving.
 * This is a fundamental signal that leads price, so it is used on its own
 * (adding a price-trend gate was shown to destroy the edge).
 * When it buys and sells: buys when the 30-day smoothed active-address count
 * turns up (demand rising) and holds while it keeps rising; sells when the
 * count turns down (demand falling). A wide 8x-ATR trail also protects against
 * a crash while demand is still nominally up.
 * When it does NOT work: demand is a slow, lagging fundmental — in a
 * speculative melt-up price can run far ahead of on-chain usage, so this
 * underperforms buy-and-hold in parabolic bulls. It is a defensive, steady
 * strategy, not a return maximizer.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const addr = ctx.data('addr_sma30');
  if (addr == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    // Exit when demand turns down, or a wide 8x ATR trail protects a crash.
    if (addr <= st.lastAddr || price <= hi - 8 * atr) {
      st.peak = null; st.lastAddr = null;
      return { side: 'sell', qty: pos };
    }
    st.lastAddr = addr;
    return null;
  }

  // Enter when demand is rising (addr > its own prior smoothed value).
  if (addr > st.lastAddr) {
    st.lastAddr = addr; st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  st.lastAddr = addr;
  return null;
}
