/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback Mean Reversion BTC 4H (Trailing Stop)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In an established uptrend, sharp dips back toward the
 * volume-weighted average price (VWAP) are temporary overreactions that tend
 * to snap back up. Buying these pullbacks inside a bull regime captures the
 * recovery while sitting in cash during bear markets.
 * When it buys and sells: buys when price pulls back below the 20-period VWAP
 * proxy while the longer trend is up (price above the 100-period EMA); exits
 * when price recovers above the VWAP line or on a 3x-ATR trailing stop.
 * When it does NOT work: in choppy sideways markets the pullback keeps
 * falling (no snap-back); in deep bear markets there is no uptrend to pull
 * back within, so it stays out and gives up the early bull bounce.
 */
function onUpdate(ctx) {
  const ema100 = ctx.ema(100, 1);
  const atr = ctx.atr(14, 1);
  if (ema100 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // VWAP proxy: simple rolling average of (typical price * volume) / volume
  let pv = 0, vsum = 0;
  for (let k = 1; k <= 20; k++) {
    const c = ctx.closes[ctx.closes.length - k];
    if (c == null) return null;
    const v = ctx.volumes[ctx.volumes.length - k];
    if (v == null) return null;
    pv += c * v;
    vsum += v;
  }
  if (vsum <= 0) return null;
  const vwap = pv / vsum;

  if (pos > 0) {
    // exit when price recovers above VWAP, or 3x-ATR trailing stop
    if (price >= vwap) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  // only buy inside an uptrend (price above the 100-period EMA)
  if (price <= ema100) return null;

  // buy the dip: price dips below VWAP but stays within 3x ATR of it
  if (price < vwap && price > vwap - atr * 3) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
