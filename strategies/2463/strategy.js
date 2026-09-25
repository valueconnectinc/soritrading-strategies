/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Reentry Cooldown
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (volume-surge breakout + 3x ATR trail) is
 *   validated but its main weakness is ~28-32% drawdown. Much of that comes from
 *   whipsaw in chop: after a stop-out the very next volume-surge break re-buys
 *   into the same failing move and gets stopped again. A re-entry cooldown forces
 *   it to wait a few bars after a stop, so it only re-enters on a cleaner setup.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume, but
 *   only if at least 6 bars have passed since the last stop-out. Exit when price
 *   drops 3x ATR below the highest close since entry.
 * When it does NOT work: A cooldown can make it miss a fast genuine breakout
 *   right after a stop, so it may underperform in strong one-way trends.
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
  const s = ctx.state;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop) {
      // Stop-out: record the bar index so re-entry is blocked for a cooldown.
      s.cooldownUntil = ctx.i + 6; // 6 bars = 1 day of 4h bars
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Re-entry cooldown: skip new buys for 6 bars after a stop-out.
  if (s.cooldownUntil != null && ctx.i < s.cooldownUntil) return null;

  if (price > hh && vol > avgVol * 1.5) {
    s.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
