/*
 * @coinsori-strategy v1
 * name: Defensive Donchian Trend ADA 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Donchian channel breakout is the only non-champion
 * family that beats buy-and-hold (ADA 1d: W1 +409% vs hold +320%), but its
 * 62-74% drawdown is too high. This version keeps the trend-breakout edge but
 * tames the drawdown with the champion's proven defensive tools: ATR
 * vol-targeted sizing (smaller position in volatile markets) and a
 * steep-downtrend filter that refuses to buy breakouts while price is crashing.
 * When it buys and sells: buys when price breaks a 55-day high AND price is not
 * in a steep downtrend; sells on a 30-day low or a 3x-ATR disaster stop.
 * When it does NOT work: it still underperforms buy-and-hold in choppy sideways
 * markets (whipsawed by the wide channel) and cannot match the champion's
 * low drawdown in prolonged bears — it is a higher-risk trend strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // 3x-ATR disaster stop: cut the position before a trend break turns catastrophic
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  // Steep-downtrend filter: do not buy breakouts while price is far below the
  // 50-EMA and falling hard — those breakouts are bull traps in a crash.
  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    // ATR vol-targeting: smaller position when volatility is high (champion's proven sizing)
    const riskBudget = 0.015;
    const volFrac = riskBudget / (atr / price);
    const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);
    return { side: 'buy', qty: qty };
  }
  return null;
}
