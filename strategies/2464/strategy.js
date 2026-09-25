/*
 * @coinsori-strategy v1
 * name: BTC 4H Two-Sided Vol-Surge Long+Short
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The long-only champion (volume-surge breakout + ATR trail)
 *   is robust but its weakness is bear windows — it absorbs drawdowns instead of
 *   profiting from them. This is the two-sided mirror: it buys 20-bar-HIGH breaks
 *   on volume AND shorts 20-bar-LOW breaks on volume, both trailed by ATR. In a
 *   downtrend the short side should turn the bear regime into profit.
 * When it buys and sells: Long when price breaks the 20-bar high on >1.5x
 *   volume; short when price breaks the 20-bar low on >1.5x volume. Either side
 *   exits when price moves 3x ATR back against it from the extreme since entry.
 * When it does NOT work: In a choppy sideways market both sides fire and get
 *   stopped repeatedly (double the whipsaw of the long-only version), and short
 *   squeezes can be violent. Fees double because of more trades.
 */
function onUpdate(ctx) {
  // 20-bar high and low (closed bars)
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;
  const s = ctx.state;

  const pos = ctx.position;
  if (pos !== 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    if (pos > 0) {
      if (s.highest == null || price > s.highest) s.highest = price;
      if (price < s.highest - 3 * atr) return { side: 'sell', qty: pos };
    } else {
      if (s.lowest == null || price < s.lowest) s.lowest = price;
      if (price > s.lowest + 3 * atr) return { side: 'buy', qty: -pos };
    }
    return null;
  }

  // Long: break 20-bar high on volume
  if (price > hh && vol > avgVol * 1.5) {
    s.highest = price; s.lowest = null;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  // Short: break 20-bar low on volume
  if (price < ll && vol > avgVol * 1.5) {
    s.lowest = price; s.highest = null;
    // margin short: use cash as margin, ~2x leverage feel via 0.98 notional
    return { side: 'sell', qty: (ctx.cash / ctx.price) * 0.98 };
  }
  return null;
}
