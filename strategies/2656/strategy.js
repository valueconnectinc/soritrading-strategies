/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Buying a deep pullback toward a rolling volume-weighted
 * average price in an uptrend, then riding the recovery. This is the
 * bull-capturing complement to the defensive band-bounce champion.
 * When it buys and sells: buys when price dips ~2 ATR below the rolling VWAP
 * while the 50-SMA is rising (uptrend) and price is above the 200-SMA. Sells
 * on a 6% trailing stop, a 10% hard stop, or when price runs 7% above VWAP.
 * When it does NOT work: whipsaws in sideways chop. Loses in sustained bears
 * where every pullback keeps falling.
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

  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const sma50p = ctx.sma(50, 6);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || sma50 == null || sma50p == null || atr == null) return null;

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

  // Uptrend: above 200-SMA AND 50-SMA rising (selective, avoids chop).
  if (price < sma200) return null;
  if (sma50 <= sma50p) return null;

  // Deep pullback: 2 ATR below VWAP (more selective than 1 ATR).
  if (price > vwap - atr * 2.0) return null;

  ctx.state.hi = price;
  ctx.state.lastExit = ctx.i;
  return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
}
