/*
 * @coinsori-strategy v1
 * name: BTC 1D Capitulation-Buy Vol-Confirmed MR
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * BTC uptrends are punctuated by sharp pullbacks that end in a panic volume spike.
 * This buys that capitulation dip (below the lower Bollinger band with a volume
 * spike) and sells the bounce back to the middle band.
 * When it does NOT work: in a sustained bear market the "dip" keeps falling (the
 * EMA50>EMA200 filter reduces but does not eliminate this), and in a low-volatility
 * grind the volume spike never fires so it sits in cash.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const avgV = ctx.avgVol(20);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const volPrev = ctx.volPrev;
  const price = ctx.price;
  if (rsi == null || bb == null || atr == null || avgV == null || ema50 == null || ema200 == null) return null;
  const prevClose = ctx.closes[ctx.i - 1];
  const s = ctx.state;
  if (s.entryBar == null) s.entryBar = -1;

  if (ctx.position > 0) {
    const entry = ctx.entryPx;
    ctx.watch([
      { side: 'sell', price: bb.mid, note: 'bounce target' },
      { side: 'sell', price: entry - 1.5 * atr, note: 'stop' }
    ]);
    if (price <= entry - 1.5 * atr) return { side: 'sell', qty: ctx.position }; // stop: 1.5x ATR (was 2x — too wide, bled through 2018)
    if (rsi > 55 || prevClose > bb.mid) return { side: 'sell', qty: ctx.position };
    if (s.entryBar >= 0 && ctx.i - s.entryBar > 20) return { side: 'sell', qty: ctx.position }; // time exit: MR should resolve in ~3 weeks
    return null;
  }

  ctx.watch([{ side: 'buy', price: bb.lower, note: 'capitulation dip' }]);
  const upTrend = ema50 > ema200;
  const oversold = rsi < 35;
  const belowBand = prevClose < bb.lower;
  const volSpike = volPrev > 1.5 * avgV;
  if (upTrend && oversold && belowBand && volSpike) {
    s.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }
  return null;
}
