/*
 * @coinsori-strategy v1
 * name: On-Chain Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's on-chain active-address count is a leading
 * indicator of network adoption and demand. When smoothed active addresses
 * are rising, buyers are entering the network and price tends to follow;
 * when they are contracting, demand is leaving and price tends to weaken.
 * This bets on the on-chain demand trend, with a long-term price trend
 * filter to cut the worst drawdowns.
 * When it buys and sells: buys when smoothed active addresses are rising
 * (current > ~60 bars ago with 1% hysteresis) while price holds above its
 * 200-day average; sells when the demand trend turns down or price breaks
 * below the 200-day average.
 * When it does NOT work: on-chain demand and price can diverge for long
 * stretches (e.g. a melt-up with flat addresses, or a flush with addresses
 * still high), so this can be late into rallies or exit too early. It is a
 * slow, low-frequency signal — do not expect it to catch sharp moves.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Smoothed on-chain active addresses (precomputed in DB).
  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  // Continuous rolling buffer — NEVER reset between trades.
  const hist = ctx.state.dhist || [];
  hist.push(now);
  if (hist.length > 60) hist.shift();
  ctx.state.dhist = hist;
  if (hist.length < 60) return null;

  const demandUp = now > hist[0] * 1.01; // 1% hysteresis, 60-bar baseline: slow signal

  // --- Exit ---
  if (pos > 0) {
    // Demand trend turned down, or long-term price trend broke.
    if (!demandUp || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // --- Entry: demand rising AND price above long-term trend ---
  if (demandUp && price > sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
