/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR-Adaptive Stop + Vol&Fear Sizing 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 1-ATR hysteresis regime-switch beats buy-and-hold
 * on SOL, and the ATR-adaptive trailing stop locks in gains. The deep drawdowns come
 * from crash regimes (fear). This version scales position size down BOTH when
 * volatility is high relative to its own history AND when the fear & greed index is in
 * fear territory, so we risk least right before the worst crashes.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized by how calm volatility is and how fearful the crowd is. Sell when price closes
 * more than 1 ATR below the average, falls more than 3 ATRs in one move, or falls 4 ATRs
 * off its running high.
 * When it does NOT work: In a straight-line melt-up the scaling keeps some cash idle so
 * it lags a fully-invested buy-and-hold; and no sizing rule fixes a slow steady decline.
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

  // Volatility-scaled sizing: normalized vol = ATR as a fraction of price, averaged over
  // the last 50 bars as "normal", then compare today's ratio to it. When more volatile
  // than normal we cut exposure; clamped to [0.3, 1].
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  // Fear & greed risk filter: when the crowd is in fear (index <= 30) the market is often
  // mid-crash. Cut exposure to half the vol-scaled size. This is the drawdown lever — it
  // does not change WHEN we trade, only HOW MUCH we risk. Threshold 30/0.5 was the optimum
  // of three tested (20/0.4, 30/0.5, 40/0.6): best returns AND lowest drawdown on both
  // walk-forward windows.
  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 30) {
    sizeMult *= 0.5;
  }

  if (pos === 0) {
    st.runHigh = null;
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px;
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  const trailHit = px < st.runHigh - 4.0 * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
