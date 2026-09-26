/*
 * @coinsori-strategy v1
 * name: Fed-Gated Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion (vol-target defensive Donchian) is
 * robust but lags buy-and-hold in sustained bull melt-ups (W3 2022-26: +77% vs
 * +263%) because its 30-day-low exit pulls it out during normal bull pullbacks.
 * The ledger independently validated a low-turnover fed-funds direction gate:
 * BTC holds up during easing/neutral fed regimes and crashes in hiking cycles.
 * This hybrid layers the macro gate onto the champion: in easing/neutral fed
 * regimes we override the 30-day-low exit and hold through bull pullbacks
 * (keeping only the 3x-ATR disaster stop), directly targeting the bull gap;
 * in hiking regimes we keep the full defensive exits.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility. Exits on a 30-day low or 3x-ATR stop
 * normally, but during fed easing/neutral the 30-day-low exit is disabled so we
 * hold through pullbacks and only bail on the 3x-ATR disaster stop.
 * When it does NOT work: if the fed dataset is missing, the gate disables and it
 * degenerates to the plain champion (still decent). If the fed regime signal is
 * noisy, it may hold through a real top that the 30-day exit would have caught.
 * This is a macro-hybrid, not a pure price strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  // Fed macro gate: current rate vs its 30-day-ago level. Rising sharply = hiking
  // (defensive); stable/falling = easing/neutral (aggressive, hold through pullbacks).
  const fedCur = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  let hiking = null; // null = no data, gate disabled -> default to defensive
  if (fedCur != null && fedLag != null) {
    hiking = fedCur > fedLag + 0.25; // >0.25pp rise in 30d = hiking cycle
  }

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Disaster stop always active.
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // 30-day-low exit: disabled during easing/neutral (hold through bull pullbacks),
    // active in hiking or when the macro gate is unknown.
    if (hiking === false) return null; // easing/neutral -> stay in
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
