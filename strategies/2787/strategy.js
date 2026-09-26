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
 * When it buys and sells: buys when the 50-day EMA is above the 200-day EMA
 * (confirmed uptrend) — either on the crossover or, after a trail exit, on a
 * pullback back to the 50-day EMA. Sells when the trend flips down or price
 * falls 8x ATR below its post-entry high.
 * When it does NOT work: in a sideways/choppy market the pullback re-entry
 * re-buys repeatedly into a range and we whipsaw on fees; and in a sharp
 * V-crash the wide trail still gives back a large chunk before it fires.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  if (ema50 == null || ema200 == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    const trail = hi - 8 * atr;
    if (ema50 < ema200 || price <= trail) {
      // Remember whether we left because the trend flipped (no re-entry)
      // or because the trail broke (allow re-entry if trend still up).
      st.trendUp = ema50 > ema200;
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Re-entry path: trend still up after a trail exit — buy the pullback to the 50-EMA.
  if (st.trendUp && ema50 > ema200) {
    // Pullback: price within 0.75x ATR above the 50-EMA (a dip back to trend).
    if (price <= ema50 + 0.75 * atr) {
      st.peak = price;
      st.trendUp = false;
      return { side: 'buy', qty: ctx.cash / price * 0.5 };
    }
    return null;
  }

  // Fresh entry on confirmed uptrend.
  if (ema50 > ema200) {
    st.peak = price;
    st.trendUp = false;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
