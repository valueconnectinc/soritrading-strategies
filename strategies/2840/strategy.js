/*
 * @coinsori-strategy v1
 * name: BTC 1D Blend + On-Chain Demand Composite
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Two independently-validated BTC families fused into one
 * composite. The price regime-switch blend (trend above 200-day, mean-reversion
 * below) is a return champion; the on-chain active-address demand trend is a
 * defensive family that leads price weakness. Hypothesis: they read different
 * parts of the market (price vs on-chain network demand), so combining them
 * should be more robust than either alone.
 * When it buys and sells: same as the blend (pullback-to-channel in trend mode,
 * deep-oversold flush in mean-reversion mode), but the trend mode is gated and
 * force-exited when smoothed on-chain demand is contracting — demand leads
 * price down, so we step aside before the price trend breaks.
 * When it does NOT work: if on-chain demand and price diverge for long periods
 * the gate can keep us in cash during a demand-lagging melt-up; and the blend's
 * known sideways-whipsaw weakness still applies. On-chain data is live in the feed.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // On-chain demand regime: smoothed active addresses vs ~30 bars back.
  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  let demandUp = null; // null = unknown, treat neutrally
  if (Number.isFinite(now) && now > 0) {
    const hist = ctx.state.dhist || [];
    hist.push(now);
    if (hist.length > 30) hist.shift();
    ctx.state.dhist = hist;
    if (hist.length >= 30) {
      demandUp = now > hist[0] * 1.002; // 0.2% hysteresis to avoid noise flips
    }
  }

  const st = ctx.state;

  // --- Exit ---
  if (pos > 0) {
    if (st.mode === 'trend' && price < sma200) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    // Defensive overlay: contracting on-chain demand exits trend mode early
    // because demand leads price weakness.
    if (demandUp === false && st.mode === 'trend') {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (st.mode === 'trend') {
      const atr = ctx.atr(14, 1);
      if (atr == null) return null;
      const peak = Math.max(st.peak || ctx.entryPx || price, price);
      st.peak = peak;
      if (price <= peak - 8 * atr) {
        st.peak = null; st.mode = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    const bb = ctx.bb(20, 2, 1), rsi = ctx.rsi(14, 1);
    if (bb == null || rsi == null) return null;
    if (rsi > 50 || price > bb.mid) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    const stopPx = st.peak != null ? st.peak * 0.75 : (ctx.entryPx || price) * 0.75;
    if (price < stopPx) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (price > (st.peak || 0)) st.peak = price;
    return null;
  }

  // --- Entry ---
  const bb = ctx.bb(20, 2, 1), rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null) return null;

  if (price > sma200) {
    // TREND MODE: do not enter while on-chain demand is contracting.
    if (demandUp === false) return null;
    const hi10 = ctx.high(10, 1), lo20 = ctx.low(20, 1);
    const hi10prev = ctx.high(10, 2);
    if (hi10 == null || lo20 == null || hi10prev == null) return null;
    if (price <= lo20 && hi10 > hi10prev) {
      st.mode = 'trend'; st.peak = price;
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  // MEAN-REVERSION MODE: buy deep-oversold panic flush at the lower band.
  if (rsi < 30 && price <= bb.lower) {
    st.mode = 'mr'; st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
