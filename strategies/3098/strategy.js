/*
 * @coinsori-strategy v1
 * name: ETH VolumeSurge Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Big moves in crypto are usually accompanied by a surge in
 * volume. Buying a fresh 20-bar high only when volume is unusually heavy rides
 * the crowd that is already committed, instead of guessing a bottom.
 * When it buys and sells: Buys when price breaks above the highest high of the
 * last 20 bars AND today's volume is at least 1.5x the average. Sells when
 * price falls back below the lowest low of the last 20 bars.
 * When it does NOT work: In a choppy, range-bound market it whipsaws — it buys
 * a fake break that reverses and exits at a loss. It also underperforms in slow
 * grinding uptrends that never produce a big volume spike.
 */
function onUpdate(ctx) {
  const s20 = ctx.high(20, 1);
  const l20 = ctx.low(20, 1);
  const v = ctx.vol;
  const av = ctx.avgVol(20);
  if (s20 == null || l20 == null || v == null || av == null) return null;

  const px = ctx.price;

  // only act on closed bars (ago>=1) so live and backtest behave the same
  const prevClose = ctx.closes[ctx.closes.length - 2];
  const prevHigh = ctx.high(20, 2);
  const prevLow = ctx.low(20, 2);
  if (prevClose == null || prevHigh == null || prevLow == null) return null;

  if (ctx.position === 0) {
    // breakout buy: close above prior 20-bar high with a volume surge
    if (prevClose > prevHigh && v > av * 1.5) {
      return { side: 'buy', qty: ctx.cash / px * 0.98 };
    }
    return null;
  }

  // exit: close below prior 20-bar low (momentum has broken)
  if (prevClose < prevLow) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
