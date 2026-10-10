/*
 * @coinsori-strategy v1
 * name: Donchian TrendSlope VolTarget
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: 55-day Donchian breakout rides crypto trends; sizing so a 2x ATR
 * stop risks only 6% of the account keeps any single loss small. A rising 200-day EMA
 * (slope filter) blocks breakouts that happen while the long-term trend is still rolling
 * over, cutting whipsaw in ranges.
 * When it buys and sells: Buys on a 55-day high breakout only when the 200-day EMA is
 * rising. Sells on a 2x ATR stop or when price closes back below the channel middle.
 * When it does NOT work: In long sideways ranges false breakouts still cause repeated
 * small losses. Vol targeting caps each loss but does not stop the chop. Trend-only.
 */
function onUpdate(ctx) {
  const n = 55;
  const trend = 200;
  const stopMult = 2.0;
  const atrN = 14;
  const riskPct = 0.06;  // risk 6% of account per trade — vol targeting keeps losses small

  const price = ctx.price;
  const pos = ctx.position;

  const upper = ctx.high(n);
  const lower = ctx.low(n);
  const atr = ctx.atr(atrN);
  const ema200 = ctx.ema(trend);
  const ema200Prev = ctx.ema(trend, 5); // 5 bars back to judge the slope
  if (upper == null || lower == null || atr == null || ema200 == null || ema200Prev == null) return null;
  const prevUpper = ctx.high(n, 1); // Donchian high of the last CLOSED bar
  if (prevUpper == null) return null;

  const trendUp = ema200 > ema200Prev; // long-term trend rising

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: prevUpper, trigger: 'above', note: '55d high breakout' }]);
    if (price > prevUpper && trendUp) {
      const riskPerCoin = stopMult * atr; // dollars risked per coin
      const qty = riskPerCoin > 0 ? (ctx.cash * riskPct) / riskPerCoin : 0;
      if (qty <= 0) return null;
      const maxQty = ctx.cash / price * 0.99;
      return { side: 'buy', qty: Math.min(qty, maxQty) };
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
