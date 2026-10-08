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
  // Closed-bar reads (ago>=1) so live and backtest see the same values.
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

  if (ctx.position > 0) {
    const entry = ctx.entryPx;
    // Stop: 2 ATR below entry — protects against a falling knife.
    ctx.watch([
      { side: 'sell', price: bb.mid, note: 'bounce target' },
      { side: 'sell', price: entry - 2 * atr, note: 'stop' }
    ]);
    if (price <= entry - 2 * atr) return { side: 'sell', qty: ctx.position };
    // Target: bounce back above the middle band or RSI recovering above 55.
    if (rsi > 55 || prevClose > bb.mid) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Entry: oversold + below lower band + volume spike, only inside a long uptrend.
  ctx.watch([{ side: 'buy', price: bb.lower, note: 'capitulation dip' }]);
  const upTrend = ema50 > ema200;
  const oversold = rsi < 35;
  const belowBand = prevClose < bb.lower;
  const volSpike = volPrev > 1.5 * avgV; // 1.5x volume = panic, not routine noise
  if (upTrend && oversold && belowBand && volSpike) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }
  return null;
}
