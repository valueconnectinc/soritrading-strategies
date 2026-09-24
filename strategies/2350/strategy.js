/*
 * @coinsori-strategy v1
 * name: DOGE Volume-Confirmed Donchian 1D
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: DOGE has pronounced boom-bust cycles, so a wide Donchian
 * breakout should catch the strong up-legs and the volume confirmation filters out
 * false breakouts in the chop. Tests whether the volume-confirmed Donchian that
 * worked on ETH also holds on a high-beta meme coin.
 * When it buys and sells: buys when price closes above the highest high of the last
 * 55 days AND that day's volume is at least 1.5x the 20-day average; sells when price
 * closes below the lowest low of the last 30 days.
 * When it does NOT work: in long sideways/choppy markets where breakouts reverse,
 * and it underperforms buy-and-hold in steady grind-up bulls because it waits for a
 * fresh breakout to get back in.
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 2);
  const lo30 = ctx.low(30, 2);
  if (hi55 == null || lo30 == null) return null;

  const closes = ctx.closes;
  const prevClose = closes[closes.length - 2];
  if (prevClose == null) return null;

  const avgVol = ctx.avgVol(20);
  const vols = ctx.volumes;
  const prevVol = vols[vols.length - 2];
  if (avgVol == null || prevVol == null) return null;

  if (ctx.position === 0) {
    const volOk = prevVol >= 1.5 * avgVol;
    if (prevClose > hi55 && volOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  if (prevClose < lo30) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
