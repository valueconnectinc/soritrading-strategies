/*
 * @coinsori-strategy v1
 * name: Regime-Blend Generalization LTC/BNB 1D
 * ex: binance
 * syms: LTCUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The regime-switch blend champion (trend-following above the
 * 200-day average, mean-reversion below) was validated on BTC and ETH where it
 * beats buy-and-hold in both bull and bear regimes. This is a generalization
 * test of that SAME recipe on two fresh untuned assets (LTC, BNB) to find where
 * the family's edge holds and where it breaks — no asset-specific tuning.
 * When it buys and sells: above the 200-day it rides pullbacks to the lower
 * Donchian channel with a trailing stop; below the 200-day it buys deep-oversold
 * panic flushes (RSI<30 at the lower Bollinger band) and sells on RSI recovery.
 * When it does NOT work: in a long sideways market the regime flips and both
 * modes whipsaw; the trend mode churns on chop-prone assets (it already failed
 * on XRP). It also lags a straight-line melt-up because the trend mode waits
 * for pullbacks.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const st = ctx.state;

  // --- Exit ---
  if (pos > 0) {
    if (st.mode === 'trend' && price < sma200) {
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
    // TREND MODE: buy a pullback to the lower 20-bar Donchian channel while the
    // 10-bar channel is still rising.
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
