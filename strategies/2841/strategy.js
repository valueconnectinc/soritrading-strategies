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
 * This bets directly on that on-chain demand trend rather than on price.
 * When it buys and sells: buys when smoothed active addresses are rising
 * (current > ~30 bars ago with hysteresis) while price holds above its 50-day
 * and RSI is not overbought; sells when the demand trend turns down or price
 * falls a full ATR-multiple from its peak.
 * When it does NOT work: on-chain demand and price can diverge for long
 * stretches (e.g. a melt-up with flat addresses, or a flush with addresses
 * still high), so this can be late into rallies or exit too early. It is a
 * slow, low-frequency signal — do not expect it to catch sharp moves.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Smoothed on-chain active addresses (30-day rolling avg, precomputed in DB).
  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  // Continuous rolling buffer — NEVER reset between trades (resets caused whipsaw).
  const hist = ctx.state.dhist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.dhist = hist;
  if (hist.length < 30) return null;

  const demandUp = now > hist[0] * 1.003; // 0.3% hysteresis to avoid noise flips

  // --- Exit ---
  if (pos > 0) {
    // Demand trend turned down -> step aside.
    if (!demandUp) {
      return { side: 'sell', qty: pos };
    }
    // ATR trail: exit if price drops 6 ATRs from the peak since entry.
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const peak = Math.max(ctx.state.peak || ctx.entryPx || price, price);
    ctx.state.peak = peak;
    if (price <= peak - 6 * atr) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // --- Entry: only when demand is rising ---
  if (demandUp) {
    const rsi = ctx.rsi(14, 1);
    const sma50 = ctx.sma(50, 1);
    if (rsi == null || sma50 == null) return null;
    // Enter on a pullback within a rising-demand regime (price above 50-day).
    if (price > sma50 && rsi < 55) {
      ctx.state.peak = price;
      return { side: 'buy', qty: ctx.cash / price * 0.95 };
    }
  }
  return null;
}
