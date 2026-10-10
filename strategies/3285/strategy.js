/*
 * @coinsori-strategy v1
 * name: Donchian Chandelier VolTarget
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: 55-day Donchian breakout rides crypto trends; sizing every position
 * so a 2x ATR stop risks only 6% of the account keeps any single loss small. Exits with a
 * chandelier trail (20-day high minus 3x ATR) instead of the channel middle so winners
 * keep running through normal pullbacks.
 * When it buys and sells: Buys on a 55-day high breakout when the 200-day trend is up.
 * Sells when price closes below the chandelier trail, or drops 2x ATR below entry (hard stop).
 * When it does NOT work: In long sideways ranges false breakouts cause repeated small
 * losses (whipsaw). Vol targeting caps each loss but does not stop the chop. Trend-only —
 * expect losses in ranges.
 */
function onUpdate(ctx) {
  const n = 55;
  const trend = 200;
  const stopMult = 2.0;
  const atrN = 14;
  const riskPct = 0.06;  // risk 6% of account per trade — vol targeting keeps losses small
  const trailLen = 20;
  const trailMult = 3.0; // chandelier: classic 3 ATR trail off the 20d high

  const price = ctx.price;
  const pos = ctx.position;

  const upper = ctx.high(n);
  const lower = ctx.low(n);
  const atr = ctx.atr(atrN);
  const ema200 = ctx.ema(trend);
  if (upper == null || lower == null || atr == null || ema200 == null) return null;
  const prevUpper = ctx.high(n, 1); // Donchian high of the last CLOSED bar
  if (prevUpper == null) return null;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: prevUpper, trigger: 'above', note: '55d high breakout' }]);
    if (price > prevUpper && price > ema200) {
      const riskPerCoin = stopMult * atr; // dollars risked per coin
      const qty = riskPerCoin > 0 ? (ctx.cash * riskPct) / riskPerCoin : 0;
      if (qty <= 0) return null;
      const maxQty = ctx.cash / price * 0.99;
      return { side: 'buy', qty: Math.min(qty, maxQty) };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr;
  const trailHigh = ctx.high(trailLen, 1); // 20d high of the last CLOSED bar
  if (trailHigh == null) return null;
  const chandelier = trailHigh - trailMult * atr;
  const prevClose = ctx.closes.at(-2);
  ctx.watch([
    { side: 'sell', price: stopPx, trigger: 'below', note: 'ATR stop' },
    { side: 'sell', price: chandelier, trigger: 'below', note: 'chandelier trail' }
  ]);
  if (price <= stopPx) return { side: 'sell', qty: pos };   // hard stop protects the account
  if (prevClose != null && prevClose < chandelier) return { side: 'sell', qty: pos };
  return null;
}
