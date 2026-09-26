/*
 * @coinsori-strategy v1
 * name: Fed-Gated Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion (vol-target defensive Donchian) is
 * robust but lags buy-and-hold in sustained bull melt-ups because its 30-day-low
 * exit pulls it out during normal bull pullbacks. The ledger independently
 * validated a low-turnover fed-funds direction gate: BTC holds up during
 * easing/neutral fed regimes and crashes in hiking cycles. This hybrid layers the
 * macro gate onto the champion: in easing/neutral fed regimes we WIDEN the exit to
 * a 60-day low (hold through normal bull pullbacks but still bail on deeper
 * corrections); in hiking regimes we keep the tight 30-day exit. Widening instead
 * of fully disabling the exit, because fully disabling rode through real crashes
 * (2018, 2020 COVID) during easing.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility. Exits on a 30-day low or 3x-ATR stop
 * in hiking; a 60-day low or 3x-ATR stop in easing/neutral.
 * When it does NOT work: if the fed dataset is missing, the gate disables and it
 * degenerates to the plain champion (still decent). If the fed regime signal is
 * noisy it may hold through a top that the 30-day exit would have caught. This is
 * a macro-hybrid, not a pure price strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null || ema50 == null) return null;

  // Fed macro gate: current rate vs its 30-day-ago level. Rising sharply = hiking
  // (tight 30-day exit); stable/falling = easing/neutral (wider 60-day exit).
  const fedCur = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  let hiking = null; // null = no data, gate disabled -> default to tight exit
  if (fedCur != null && fedLag != null) {
    hiking = fedCur > fedLag + 0.25; // >0.25pp rise in 30d = hiking cycle
  }

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Disaster stop always active.
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    const exitLow = (hiking === false) ? ll60 : ll30; // widen exit during easing
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
