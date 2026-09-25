/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge + ATR Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Breakouts on heavy volume tend to be real moves, not noise.
 *   Buying a 20-bar-high break that comes with >1.5x average volume rides genuine
 *   momentum, and a wide 3x-ATR trailing stop lets winners run while cutting
 *   losers. This proved the most robust recipe across BTC/ETH/SOL and many
 *   walk-forward windows in this development job.
 * When it buys and sells: Buy when price breaks the 20-bar high on above-average
 *   volume. Exit only when price falls 3x ATR below the highest close since entry.
 * When it does NOT work: In a fast crash price can gap through the ATR trail, so
 *   deep drawdowns are still possible; and in a long flat range the 20-bar-high
 *   break whipsaws, paying extra fees. It is a momentum strategy, so it loses in
 *   chop and is fully invested during drawdowns.
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
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
