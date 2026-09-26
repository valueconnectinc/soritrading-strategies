/*
 * @coinsori-strategy v1
 * name: EMA50/200 Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a clear bull trend (fast 50-day average above the
 * slow 200-day average) price tends to keep making higher highs, so we ride
 * the trend and only exit when the trend actually flips or we lose too much.
 * When it buys and sells: buys when the 50-day EMA crosses above the 200-day
 * EMA (trend turns up); sells when the 50-day EMA crosses back below the
 * 200-day EMA (trend flips down) or price falls 8x ATR below our entry high
 * (a wide trail that lets winners run but cuts deep losses).
 * When it does NOT work: in a sideways/choppy market the two EMAs cross back
 * and forth and we whipsaw; and in a sharp V-shaped crash the wide trail
 * gives back a large chunk before it triggers.
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
    // Wide trail: 8x ATR below the highest price since entry.
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    const trail = hi - 8 * atr;
    // Exit when trend flips down or the wide trail breaks.
    if (ema50 < ema200 || price <= trail) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter when the fast EMA crosses above the slow EMA (trend turns up).
  if (ema50 > ema200) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
