/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Adoption Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price is ultimately driven by real network usage. When the
 * number of daily ACTIVE ADDRESSES is growing (more people actually using the network) and
 * price is above its long-term 200-day average, the market is in a healthy adoption regime.
 * This uses an on-chain fundamental signal (ctx.data 'addr') instead of only price math.
 * When it buys and sells: Buy when active addresses grew versus the prior day AND price is
 * above the 200-day average. Sell only when price drops 3% below the 200-day average (a trend
 * break) — adoption is NOT used to exit, only to gate entries, so it cannot churn the position.
 * When it does NOT work: Adoption data is noisy day-to-day and can lag price. In a bubble
 * where price runs far ahead of real usage, the adoption gate keeps you out of the top of
 * the move; and on-chain data is sparse, so a bad missing-data day can delay an entry.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma200 = ctx.sma(200, 1);
  if (px == null || sma200 == null || px <= 0) return null;

  // On-chain adoption: daily active addresses (ctx.data 'addr').
  const addr = ctx.data('addr');
  if (addr == null || addr <= 0) return null;

  const st = ctx.state;
  const prevAddr = st.prevAddr;
  st.prevAddr = addr;
  if (prevAddr == null || prevAddr <= 0) return null; // need two samples to measure growth

  const addrGrowth = addr / prevAddr - 1; // daily adoption growth, + = network growing
  const adoptionUp = addrGrowth > 0;
  const pos = ctx.position;

  if (pos === 0) {
    // Enter only when adoption is growing AND price is in a long uptrend.
    if (adoptionUp && px > sma200 && ctx.price > 0) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit ONLY on a trend break (3% below the 200-day average). Adoption never triggers exit,
  // so the position is not whipsawed by noisy day-to-day address changes.
  if (px < sma200 * 0.97) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
