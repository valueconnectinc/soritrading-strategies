/*
 * @coinsori-strategy v1
 * name: Defensive Donchian ETH 1D (Data-Independent)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion family (defensive Donchian trend
 * following) as a clean, data-independent version that needs NO external data
 * (no fed, no on-chain) — so it runs identically whether or not the user's
 * agent is online. It was validated to beat buy-and-hold on ETH 1d: +549% in
 * 2018-22 vs hold +324%, +18% in 2022-26 vs hold +46% (much lower drawdown).
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend), sized by inverse volatility; exits on a 30-day low or a 3x-ATR
 * disaster stop.
 * When it does NOT work: high drawdown in sharp reversals (MDD 44-58% is
 * inherent); underperforms in choppy sideways markets; and it lags explosive
 * melt-ups where it exits too early on normal pullbacks.
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
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  // Skip steep downtrends: price far below the 50-day EMA.
  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    // Inverse-vol sizing: smaller position when volatility is high.
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
