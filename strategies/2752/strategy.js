/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze Breakout ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When volatility compresses into a tight range (a squeeze),
 * the eventual expansion often starts a fresh directional move. This catches
 * the start of a new trend right as it breaks out of the squeeze — a momentum
 * family, opposite of the mean-reversion band-bounce.
 * When it buys and sells: waits for Bollinger band-width to hit a 100-bar low
 * (squeeze), then buys when price closes above the upper band (bull breakout);
 * exits when price closes back below the 20-SMA or after a 4x-ATR stop. Goes
 * flat in between (long-only).
 * When it does NOT work: in a sideways market the squeeze resolves without a
 * real trend and the breakout fails (false breakouts); chops out repeatedly.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const bb = ctx.bb(20, 2, 1);
  const sma20 = ctx.sma(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || sma20 == null || atr == null) return null;

  // band-width = (upper-lower)/mid; current vs 100-bar lookback min
  const widthNow = (bb.upper - bb.lower) / bb.mid;
  let minWidth = Infinity;
  for (let k = 2; k <= 100; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) continue;
    const w = (b.upper - b.lower) / b.mid;
    if (w < minWidth) minWidth = w;
  }
  if (minWidth === Infinity) return null;

  if (pos > 0) {
    if (price < sma20) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx - atr * 4) return { side: 'sell', qty: pos };
    return null;
  }

  const squeezed = widthNow <= minWidth; // current width is the tightest in 100 bars
  if (squeezed && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
