/*
 * @coinsori-strategy v1
 * name: SOL 1D MR Half-TP + Trend-Ride
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SOL 1D MR champion (+106% full) is defensive but lags
 * buy-and-hold badly in a melt-up because it exits fully on every EMA20 snap-back. This
 * variant keeps that proven dip-buying entry but takes only HALF the position when price
 * recovers to the 20-day EMA, letting the other half ride the trend with a wide ATR stop.
 * The goal: keep the bear protection while capturing more of a sustained move.
 * When it buys and sells: buy when price closes below the lower Bollinger (20,2) with
 * RSI(14)<30, only while the 200-day average is rising. Sell half when price closes back
 * above the 20-day EMA; sell the rest when the 200-day trend turns down or price falls 4x
 * ATR below the highest close since the half-exit.
 * When it does NOT work: in a broad coordinated bear the rising-trend gate keeps it flat
 * (safe, little upside); the trend-riding half can give back gains in a choppy recovery,
 * and in a melt-up it still lags holding the whole way.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.position;

  if (pos > 0) {
    const st = ctx.state;
    // Track the peak for the trailing stop.
    st.peak = st.peak != null ? Math.max(st.peak, price) : price;

    // If we already took the half (riding the trend), exit the rest on trend break or wide stop.
    if (st.halfTaken === true) {
      const trailStop = st.peak - 4 * atr; // wide trail so the riding half survives normal pullbacks
      if (price < trailStop || !uptrend) {
        st.peak = null; st.halfTaken = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }

    // Not yet half-taken: snap back above EMA20 takes half, rest rides.
    if (price > ema20) {
      st.halfTaken = true;
      st.peak = Math.max(st.peak, price);
      return { side: 'sell', qty: pos * 0.5 };
    }
    // Trend broke before recovery: close everything.
    if (!uptrend) {
      st.peak = null; st.halfTaken = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const flush = price < bb.lower && rsi < 30; // deep oversold dip inside an uptrend
  if (flush) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    ctx.state.halfTaken = null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
