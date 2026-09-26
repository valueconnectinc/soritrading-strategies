/*
 * @coinsori-strategy v1
 * name: EMA50/200 Trend w/ Re-entry BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a clear bull trend (fast 50-day average above the
 * slow 200-day average) price tends to keep making higher highs. The plain
 * trend strategy rides the bull but its wide stop gives back a big chunk of
 * the rally and it only re-enters on a fresh crossover, so it lags
 * buy-and-hold. Adding a pullback re-entry keeps us in the bull longer.
 * When it buys and sells: buys on a fresh 50/200 crossover (trend turns up),
 * or after a trail exit re-buys a pullback back to the 50-day EMA while the
 * trend is still up. Sells when the trend flips down or price falls 8x ATR
 * below its post-entry high.
 * When it does NOT work: in a sideways/choppy market the pullback re-entry
 * re-buys repeatedly into a range and we whipsaw on fees; and in a sharp
 * V-crash the wide trail still gives back a large chunk before it fires.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const e50 = ctx.ema(50, 1), e50p = ctx.ema(50, 2);
  const e200 = ctx.ema(200, 1), e200p = ctx.ema(200, 2);
  if (e50 == null || e50p == null || e200 == null || e200p == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const st = ctx.state;
  const crossUp = e50p <= e200p && e50 > e200; // fresh 50/200 crossover this bar

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    const trail = hi - 8 * atr;
    if (e50 < e200 || price <= trail) {
      // trail exit while trend still up -> allow pullback re-entry
      st.trendUp = e50 > e200;
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // If the trend flipped down, clear any pending re-entry state.
  if (e50 < e200) st.trendUp = false;

  // Established uptrend after a trail exit: wait for a pullback to the 50-EMA.
  if (st.trendUp && e50 > e200) {
    if (price <= e50 + 0.75 * atr) {
      st.peak = price;
      st.trendUp = false;
      return { side: 'buy', qty: ctx.cash / price * 0.5 };
    }
    return null;
  }

  // Fresh crossover entry only.
  if (crossUp) {
    st.peak = price;
    st.trendUp = false;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
