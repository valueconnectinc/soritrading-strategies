/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Bounce 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: in a long-term uptrend, sharp RSI oversold dips are temporary and revert higher.
 * When it buys and sells: buys when RSI(14) drops below 30 while price is above its 100-bar average; sells when RSI recovers above 60, when the trend breaks below the 100-bar average, or on a hard 2.5x ATR stop.
 * When it does NOT work: sustained bear markets or deep chop where oversold keeps getting more oversold (catching falling knives) — the uptrend filter is what protects against this.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const ema100 = ctx.ema(100, 1);
  const atr = ctx.atr(14, 1);
  if (rsi == null || ema100 == null || atr == null) return null;
  const close = ctx.closes[ctx.i - 1];
  if (close == null) return null;

  const stopMult = 2.5; // ATR stop: wide enough to survive noise, tight enough to cap loss
  const riskPct = 0.02; // risk only 2% of cash per trade so a bad dip does not hurt the account
  const inUptrend = close > ema100;

  if (ctx.position <= 0) {
    if (inUptrend && rsi < 30) {
      const stopPx = ctx.price - stopMult * atr;
      const qty = Math.min((ctx.cash * riskPct) / (stopMult * atr), (ctx.cash * 0.99) / ctx.price);
      ctx.watch([{ side: 'sell', price: stopPx, note: 'ATR stop' }]);
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr;
  ctx.watch([{ side: 'sell', price: stopPx, note: 'ATR stop' }]);
  const brokeTrend = close < ema100;
  if (rsi > 60 || brokeTrend || ctx.price <= stopPx) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
