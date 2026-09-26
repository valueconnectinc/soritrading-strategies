/*
 * @coinsori-strategy v1
 * name: Defensive Donchian Price-Bull Wide Exit DOGE 1D
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Exact copy of the confirmed defensive Donchian champion
 * (validated on BTC/ETH 1d). Buys 55-day-high breakouts but holds through
 * normal bull pullbacks with a wide 60-day exit when price is above its 100-day
 * EMA, else a tight 30-day exit. Pure-price, runs offline with no external data.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend), sized by inverse volatility; exits on a 3x-ATR stop, or a 60-day
 * low when price>EMA100, else a tight 30-day low.
 * When it does NOT work: high drawdown in sharp reversals (MDD 40-60% inherent);
 * may fail on DOGE since it is a meme alt with extreme volatility; underperforms
 * in choppy sideways; lags if DOGE lacks sustained multi-year trends.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  const ema100 = ctx.ema(100, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null || ema100 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    const exitLow = price > ema100 ? ctx.low(60, 1) : ll30;
    if (exitLow != null && price < exitLow) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
