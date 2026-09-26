/*
 * @coinsori-strategy v1
 * name: Continuous Vol-Target Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the CONFIRMED champion after 69 cycles of
 * exploration. The defensive Donchian (55d-high breakout entry, 30d-low /
 * 3x-ATR exit, EMA50 downtrend gate) with CONTINUOUS inverse-volatility sizing
 * consistently beats buy-and-hold on large-cap BTC in bear-inclusive windows
 * while capping drawdown. It is a defensive trend family: it protects capital
 * in crashes and participates in trends, at the cost of lagging pure melt-ups.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility (risk less when vol is high), exits on
 * a 30-day-low break or a 3x-ATR disaster stop from entry.
 * When it does NOT work: in a sustained calm bull it lags buy-and-hold (defensive
 * by design); it carries ~40% drawdown in sharp reversals. It is a capital
 * protector + trend participant, not a melt-up maximizer.
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

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    // continuous inverse-vol sizing: target 3% daily risk, clamp for sanity
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
