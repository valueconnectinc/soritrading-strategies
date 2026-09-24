/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR-Adaptive Stop + Vol-DeRisk 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 1-ATR hysteresis regime-switch beats buy-and-hold
 * on SOL, and the ATR-adaptive trailing stop locks in gains. But all-in/all-out
 * produced deep drawdowns (up to 76%) because a position held through a volatility
 * spike gives back the whole run before the trailing stop triggers. This version
 * de-risks DURING the hold: when volatility spikes above its own normal level we
 * trim exposure, and we scale the trailing stop tighter as volatility rises.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized by how calm volatility is. Sell (or trim) when volatility spikes, price closes
 * more than 1 ATR below the average, falls more than 3 ATRs in one move, or falls off
 * its running high by a volatility-scaled distance.
 * When it does NOT work: In a straight-line melt-up the de-risking keeps some cash
 * idle so it lags a fully-invested buy-and-hold; and no sizing rule fixes a slow
 * steady decline where price never makes a new high.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 3.0 * atr;

  // Normalized volatility = ATR as a fraction of price, averaged over 50 bars = "normal".
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let normRatio = null;
  if (ratioCount >= 20) normRatio = ratioSum / ratioCount;
  const currentRatio = atr / px;
  const volSpike = normRatio != null && currentRatio > 1.5 * normRatio; // choppy regime

  // Trailing stop scales with volatility: calm -> wide (6 ATR), choppy -> tight (2 ATR).
  // Tightening in high-vol regimes locks in gains before a spike can reverse.
  let trailMult = 4;
  if (normRatio != null) {
    trailMult = Math.max(2, Math.min(6, 6 * (normRatio / currentRatio)));
  }

  if (pos === 0) {
    st.runHigh = null;
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px;
      // Size by calmness: when vol is above normal we enter smaller.
      let sizeMult = 1;
      if (normRatio != null) sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  const trailHit = px < st.runHigh - trailMult * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }

  // In-position de-risking: if volatility spikes while we hold, trim to half.
  // This caps how much a single spike can cost us before the trailing stop fires.
  if (volSpike && pos > 0) {
    const trimQty = pos * 0.5;
    if (trimQty > 0.0001) return { side: 'sell', qty: trimQty };
  }
  return null;
}
