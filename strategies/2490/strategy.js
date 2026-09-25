/*
 * @coinsori-strategy v1
 * name: Champion + Volatility-Scaled Sizing
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The volume-surge champion risks the same position size on
 *   every breakout, but high-volatility breakouts (wide ATR) are riskier and
 *   produce the deepest drawdowns. Sizing positions inversely to ATR keeps the
 *   dollar risk per trade roughly constant, so a violent spike risks the same
 *   as a calm breakout.
 * When it buys and sells: Same entry/exit as the champion (20-bar-high break on
 *   >1.5x volume, 3x ATR trail), but the buy quantity is scaled down when ATR
 *   is high relative to its recent average.
 * When it does NOT work: Scaling down size in high-vol regimes also cuts the
 *   biggest winners (breakouts that turn into huge trends often start with a
 *   volatility spike), so it can lag the champion in powerful bull runs.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    if (h == null) return null;
    if (h > hh) hh = h;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    // Average of the last 50 ATR values (closed bars) as the "normal" vol level.
    let sum = 0, n = 0;
    for (let i = 1; i <= 50; i++) {
      const a = ctx.atr(14, i);
      if (a == null) break;
      sum += a; n++;
    }
    let scale = 1;
    if (n >= 20) {
      const atrAvg = sum / n;
      const atrNow = ctx.atr(14);
      if (atrNow != null && atrAvg > 0 && atrNow / atrAvg > 1.5) scale = 0.5;
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 * scale };
  }
  return null;
}
