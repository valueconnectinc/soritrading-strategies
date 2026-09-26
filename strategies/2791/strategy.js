/*
 * @coinsori-strategy v1
 * name: BTC 1D EMA50/200 Trend + Re-entry
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a clear bull trend (50-day average above the 200-day
 * average) price tends to keep making higher highs. A fresh trend turn-up is
 * bought immediately to capture the whole move; after a trail exit the trend
 * is often still intact, so we re-enter on the next pullback instead of
 * waiting for a full re-cross.
 * When it buys and sells: buys immediately when the 50-day EMA crosses above
 * the 200-day EMA (fresh trend up); after a trail exit, re-enters when price
 * pulls back to the 50-day EMA. Sells when the trend flips down or price
 * falls 8x ATR below the entry high.
 * When it does NOT work: in a sideways/choppy market the two EMAs cross back
 * and forth and we whipsaw; and in a sharp V-shaped crash the wide trail gives
 * back a large chunk before it triggers. Defensive BTC edge, not a return
 * maximizer.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1), ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (ema50 == null || ema200 == null || atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    if (ema50 < ema200 || price <= hi - 8 * atr) {
      st.peak = null; st.entered = true; // mark that we were in the trade
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Fresh trend turn-up: buy immediately to capture the whole bull.
  if (ema50 > ema200 && st.entered !== true) {
    st.peak = price; st.entered = true;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }

  // Re-entry after a trail exit while trend still up: wait for a pullback.
  if (ema50 > ema200 && st.entered === true && price <= ema50 + 0.5 * atr) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }

  // Trend flipped down: reset so the next turn-up is a fresh entry.
  if (ema50 < ema200) st.entered = false;
  return null;
}
