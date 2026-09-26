/*
 * @coinsori-strategy v1
 * name: On-Chain Active-Address Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's daily active addresses are a proxy for real
 * network usage. When usage is growing (addresses above their 30-day average)
 * it signals a healthy, expanding network — a bullish fundamental backdrop.
 * Combined with price above the 200-day SMA (trend confirmation), this is a
 * slow on-chain fundamental trend follower, a different family from price
 * oscillators.
 * When it buys and sells: buys when active addresses are above their 30-day
 * average AND price is above the 200-SMA; sells when addresses fall below
 * their average or price drops below the 200-SMA.
 * When it does NOT work: the address data is slow and lagging, so it misses
 * fast price moves and can whipsaw in sideways chop. It sits in cash during
 * bear markets (safe but idle). Address spikes can be noise (exchange moves,
 * airdrops) that don't reflect genuine adoption.
 */
function onUpdate(ctx) {
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  if (addr == null || addrSma == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Exit: addresses falling below their average, or price below the 200-SMA.
  if (pos > 0) {
    if (addr < addrSma || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: addresses rising above average AND price above 200-SMA.
  if (addr > addrSma && price > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
