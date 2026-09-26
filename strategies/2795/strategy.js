/*
 * @coinsori-strategy v1
 * name: BTC 1D Regime-Switch Blend (Trend + Mean Reversion)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Different market regimes need different tools. Above the
 * 200-day average (a bull trend) price tends to keep trending, so we ride
 * pullbacks to the Donchian channel. Below the 200-day average (a bear or
 * chop) buying panic flushes and riding the snap-back has been the most
 * robust edge. Switching between the two based on where price sits relative
 * to the long average captures the trend in bulls AND the mean-reversion
 * edge in bears — solving each family's known weakness on its own.
 * When it buys and sells: above the 200-day it buys pullbacks to the lower
 * Donchian channel and rides the trend with a trailing stop; below the
 * 200-day it buys deep-oversold panic flushes (RSI<30 at the lower Bollinger
 * band) and sells on RSI recovery. Either mode exits if price crosses the
 * 200-day the wrong way.
 * When it does NOT work: in a long sideways market the regime can flip back
 * and forth and both modes whipsaw; and below the 200-day in a grinding
 * downtrend the oversold bounces can be weak. It also lags a straight-line
 * melt-up because the trend mode waits for pullbacks.
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
    // TREND MODE: buy a pullback to the lower 20-bar Donchian channel while
    // the 10-bar channel is still rising (uptrend intact).
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
