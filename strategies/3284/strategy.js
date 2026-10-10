/*
 * @coinsori-strategy v1
 * name: Donchian Volatility-Targeted
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The classic 55-day Donchian breakout rides crypto trends, but
 * fixed full-size entries can ruin the account in a volatile regime. We keep the
 * breakout edge but size every position so a 2x ATR stop risks only 1% of the
 * account — high volatility automatically shrinks position size. Survives any regime.
 * When it buys and sells: Buys on a 55-day high breakout when the 200-day trend is up.
 * Sells on a 2x ATR stop or when price closes back below the channel middle.
 * When it does NOT work: In long sideways ranges false breakouts still cause repeated
 * small losses (whipsaw). Volatility targeting caps the size of each loss but does not
 * stop the chop from churning. Trend-only — expect losses in ranges.
 */
function onUpdate(ctx) {
  const n = 55;
  const trend = 200;
  const stopMult = 2.0;
  const atrN = 14;
  const riskPct = 0.01;  // risk 1% of account per trade

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
      // riskPerCoin in dollars = stop distance as fraction of price * price
      const riskPerCoinUsd = stopMult * atr * price;
      const qty = riskPerCoinUsd > 0 ? (ctx.cash * riskPct) / riskPerCoinUsd : 0;
      if (qty <= 0) return null;
      const maxQty = ctx.cash / price * 0.99;
      return { side: 'buy', qty: Math.min(qty, maxQty) };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr * ctx.entryPx; // ATR is a fraction
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
