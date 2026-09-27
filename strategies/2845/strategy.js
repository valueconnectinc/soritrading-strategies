/*
 * @coinsori-strategy v1
 * name: On-Chain Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's on-chain active-address count and mining
 * hashrate are leading indicators of network adoption and demand. When both
 * are rising, buyers are entering the network and price tends to follow.
 * This bets on that joint on-chain demand trend rather than on price alone.
 * When it buys and sells: buys when both smoothed active addresses and
 * hashrate are rising (current > ~30 bars ago with 0.3% hysteresis) and stays
 * long while that joint trend holds. It sells when either turns down — BUT in
 * a strong bull regime (price above its 200-day average) it only sells when
 * BOTH turn down, so it does not get shaken out of a powerful rally. This is
 * the one change from the validated baseline: it keeps winners longer in
 * strong trends to close the "too conservative in bull markets" gap.
 * When it does NOT work: on-chain demand and price can diverge for long
 * stretches (melt-up with flat addresses, or a flush with addresses still
 * high), so it can be late into rallies or exit too early. It is a slow,
 * low-frequency signal and can still miss sharp, news-driven moves.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Smoothed on-chain active addresses AND hashrate (both precomputed in DB).
  const addr = Number(ctx.data('addr_sma30'));
  const hash = Number(ctx.data('hashrate_sma30'));
  if (!Number.isFinite(addr) || addr <= 0) return null;
  if (!Number.isFinite(hash) || hash <= 0) return null;

  // Continuous rolling buffers — NEVER reset between trades.
  const ahist = ctx.state.ahist || [];
  ahist.push(addr);
  if (ahist.length > 30) ahist.shift();
  ctx.state.ahist = ahist;

  const hhist = ctx.state.hhist || [];
  hhist.push(hash);
  if (hhist.length > 30) hhist.shift();
  ctx.state.hhist = hhist;

  if (ahist.length < 30 || hhist.length < 30) return null;

  const addrUp = addr > ahist[0] * 1.003; // 0.3% hysteresis
  const hashUp = hash > hhist[0] * 1.003;
  const bothUp = addrUp && hashUp;

  // Strong-bull regime: price above 200-day average (standard long-term trend).
  const sma200 = ctx.sma(200);
  if (sma200 == null) return null;
  const bull = price > sma200;

  // --- Exit ---
  if (pos > 0) {
    // In a strong bull, only exit when BOTH demand signals turn down;
    // otherwise (weak/flat market) exit when either turns down.
    const exitNow = bull ? !addrUp && !hashUp : !bothUp;
    if (exitNow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // --- Entry: both must be rising ---
  if (bothUp) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
