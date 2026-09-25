/*
 * @coinsori-strategy v1
 * name: BNB 4H Volume-Surge Breakout Momentum
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated volume-surge breakout momentum recipe
 *   (20-bar-high break on >1.5x average volume, exit on 3x ATR trail below the
 *   highest close since entry). Proven on BTC across 3 windows and on ETH/SOL.
 *   Momentum family — the complement to the defensive band-bounce champion.
 * When it buys and sells: Buy when price breaks above its 20-bar high on
 *   above-average volume (1.5x the 50-bar average). Sell when price drops 3x ATR
 *   below the highest close since entry, locking in gains as the trend rides.
 * When it does NOT work: In a chop/range with no real breakouts it whipsaws and
 *   churns fees; in a fast crash it can enter right at a false breakout top.
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
