/*
 * @coinsori-strategy v1
 * name: BTC 1D Donchian Trend + ATR Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 1D Donchian trend (55-day entry / 30-day exit) was
 *   positive in every walk-forward window but carried 43-58% drawdown. This
 *   replaces the wide 30-day exit with the champion's proven 3x ATR trailing
 *   stop, which cut the vol-surge family's MDD from 44% to 28% while keeping
 *   returns. Uses only price/ATR (available in every feed).
 * When it buys and sells: Buy a break above the 55-day high. Exit when price
 *   drops 3x ATR below the highest close since entry (tightens the exit to
 *   protect gains instead of giving back 30 days of range).
 * When it does NOT work: In a straight-line bull with no pullbacks the tighter
 *   ATR trail can exit early and miss the melt-up, so it may lag buy-and-hold
 *   in raging bulls (same limitation as all trend-following on crypto).
 */
function onUpdate(ctx) {
  // 55-day Donchian entry channel.
  let hh = -Infinity;
  for (let i = 1; i <= 55; i++) {
    const h = ctx.high(55, i);
    if (h == null) return null;
    if (h > hh) hh = h;
  }
  const price = ctx.price;
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
