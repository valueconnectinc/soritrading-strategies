/*
 * @coinsori-strategy v1
 * name: BTC 1D Regime-Switch MR Core + Melt-Up Leg
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive mean-reversion champion (BTC 1D) lags
 * buy-and-hold in straight-line melt-ups because its uptrend entry waits for a deep
 * pullback that never comes. Pure trend-following on BTC fails because it whipsaws
 * at the 200-day line. This attacks the melt-up lag with a HIGH-CONVICTION trend leg
 * that only fires when price is far above the long-term trend (not at the line), so
 * it rides melt-ups without the churn that kills naive trend-followers. The defensive
 * MR core is kept unchanged for crashes.
 * When it buys and sells: MR core: buy Bollinger-low RSI<30 or Keltner-low RSI<40 in a
 * rising 200-day, sell on snap-back above EMA20 or RSI>55. Melt-up leg: when price is
 * >25% above the 200-day AND above its 50-day EMA, buy on a momentum resume (price
 * reclaims EMA20) and sell when price closes back below EMA20.
 * When it does NOT work: In a choppy but elevated market the melt-up leg churns on
 * EMA20 crossovers; in a persistent bear the MR core can catch a falling knife. The
 * melt-up leg still can't match buy-and-hold in the most extreme blow-off tops.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null ||
      ema20 == null || ema50 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  // Melt-up regime: price well above the 200-day (strong trend, not near the line)
  // and above the 50-day EMA (momentum intact). This is the high-conviction trigger
  // that avoids the whipsaw zone near the 200-day.
  const meltUp = price > sma200 * 1.25 && price > ema50;

  const st = ctx.state;

  if (pos > 0) {
    // Determine which leg owns the position.
    if (st.leg === 'melt') {
      // Melt-up leg: fast, tight exit below the 20-day EMA.
      if (price < ema20) {
        st.leg = null;
        st.cd = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // MR core exit: snap-back above EMA20 or RSI recovery.
    if (price > ema20 || rsi > 55) {
      st.leg = null;
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  // MELT-UP LEG: only in a strong confirmed uptrend with momentum resume.
  if (meltUp) {
    const prev = ctx.ema(20, 2);
    if (prev != null && prev <= ema20) {   // price reclaimed EMA20 (momentum resume)
      st.leg = 'melt';
      st.cd = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // MR CORE: deep oversold flush inside a rising 200-day trend.
  if (!uptrend) return null;
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;
  if (bollingerFlush || keltnerPullback) {
    st.leg = 'mr';
    st.cd = null;
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
