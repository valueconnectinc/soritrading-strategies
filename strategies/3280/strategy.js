/*
 * @coinsori-strategy v1
 * name: Donchian Baseline (temp comparison)
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: EXACT copy of validated strategy 3269 (full-size Donchian 55d
 * breakout) used ONLY to compare against the vol-adaptive variant on identical windows.
 * When it buys and sells: same as 3269.
 * When it does NOT work: same as 3269.
 */
function onUpdate(ctx) {
  const n = 55;
  const trend = 200;
  const stopMult = 2.0;
  const atrN = 14;

  const price = ctx.price;
  const pos = ctx.position;

  const upper = ctx.high(n);
  const lower = ctx.low(n);
  const atr = ctx.atr(atrN);
  const ema200 = ctx.ema(trend);
  if (upper == null || lower == null || atr == null || ema200 == null) return null;

  const prevUpper = ctx.high(n, 1);
  if (prevUpper == null) return null;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: prevUpper, trigger: 'above', note: '55d high breakout' }]);
    if (price > prevUpper && price > ema200) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr;
  const mid = (upper + lower) / 2;
  const prevClose = ctx.closes.at(-2);
  ctx.watch([
    { side: 'sell', price: stopPx, trigger: 'below', note: 'ATR stop' },
    { side: 'sell', price: mid, trigger: 'below', note: 'channel mid fail' }
  ]);
  if (price <= stopPx) return { side: 'sell', qty: pos };
  if (prevClose != null && prevClose < mid) return { side: 'sell', qty: pos };
  return null;
}
