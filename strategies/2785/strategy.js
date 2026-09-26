/*
 * @coinsori-strategy v1
 * name: EMA20/100 Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A faster trend pair (20-day vs 100-day average) than the
 * classic 50/200. The faster pair re-enters bulls sooner and exits bears
 * earlier, so it captures more of the move while staying low-frequency enough
 * not to overtrade on daily bars.
 * When it buys and sells: buys when the 20-day EMA crosses above the 100-day
 * EMA (trend turns up); sells when the 20-day EMA crosses back below the
 * 100-day EMA (trend flips down) or price falls 8x ATR below the highest point
 * since entry (a wide trail that lets winners run but cuts deep losses).
 * When it does NOT work: in a sideways/choppy market the two EMAs cross back
 * and forth and we whipsaw; and in a sharp V-shaped crash the wide trail gives
 * back a large chunk before it triggers.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema100 = ctx.ema(100, 1);
  if (ema20 == null || ema100 == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    // Wide trail: 8x ATR below the highest price since entry.
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    const trail = hi - 8 * atr;
    if (ema20 < ema100 || price <= trail) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (ema20 > ema100) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
