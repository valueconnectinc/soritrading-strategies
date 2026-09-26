/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback LTC 4H
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The VWAP-pullback family is the bull-capturing complement
 * to the defensive band-bounce champion. It validated on BTC (beats hold 3/3)
 * and SOL (positive 3/3) but failed on ETH (over-fires). This tests whether the
 * edge generalizes to LTC, a mature large-cap, using the BTC-validated recipe.
 * When it buys and sells: buys when price dips ~1 ATR below the 50-bar rolling
 * VWAP. Sells on a 6% trailing stop, a 10% hard stop, or when price runs 7%
 * above VWAP (overextension).
 * When it does NOT work: whipsaws in sideways chop where price hovers around
 * VWAP; loses in sustained bears where every pullback keeps falling. The recipe
 * is asset-specific — it may over-fire on LTC like it did on ETH.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;

  const N = 50;
  if (ctx.i < N) return null;

  let pv = 0, vsum = 0;
  for (let k = 1; k <= N; k++) {
    const c = ctx.closes[ctx.closes.length - 1 - k];
    const v = ctx.volumes ? ctx.volumes[ctx.volumes.length - 1 - k] : null;
    if (c == null || v == null) return null;
    pv += c * v;
    vsum += v;
  }
  if (vsum <= 0) return null;
  const vwap = pv / vsum;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  if (pos > 0) {
    const entry = ctx.entryPx || price;
    if (price <= entry * 0.90) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const hi = Math.max(ctx.state.hi || entry, price);
    ctx.state.hi = hi;
    if (price <= hi * 0.94) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (price >= vwap * 1.07) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // Buy when price dips ~1 ATR below VWAP (a pullback toward the mean).
  if (price > vwap - atr * 1.0) return null;

  ctx.state.hi = price;
  ctx.state.lastExit = ctx.i;
  return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
}
