/*
 * @coinsori-strategy v1
 * name: Trend-Adaptive Exit Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion (vol-target defensive Donchian) is
 * robust but lags buy-and-hold in sustained bull melt-ups (W3 2022-26: +77% vs
 * +263%) because its fixed 30-day-low exit gets shaken out of normal bull
 * pullbacks and then re-enters late on 55-day highs, missing the melt-up. This
 * makes the exit ADAPTIVE to trend strength: in a strong uptrend we widen the
 * exit to a 60-day low (hold through normal pullbacks); when the trend weakens
 * we tighten back to a 30-day low. Pure price, no external data.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility. Exits on a 3x-ATR disaster stop, or
 * a 60-day low in a strong uptrend / 30-day low otherwise.
 * When it does NOT work: in choppy sideways markets the wider exit in
 * trend-looking phases gives back more before the exit triggers; and a sharp
 * crash that never gives a "weak trend" signal before falling will still be
 * caught by the 3x-ATR stop but with more give-back than the fixed champion.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null) return null;
  if (ema20 == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Disaster stop always active.
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // Strong uptrend = EMA20 above EMA50 and price above EMA20 -> widen exit to
    // 60-day low so normal bull pullbacks don't shake us out.
    const strongTrend = ema20 > ema50 && price > ema20;
    const exitLow = strongTrend ? ll60 : ll30;
    if (price < exitLow) return { side: 'sell', qty: pos };
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
