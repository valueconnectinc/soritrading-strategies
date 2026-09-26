/*
 * @coinsori-strategy v1
 * name: Fed-Gated Vol-Confirm Donchian ETH 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Two edges were each independently confirmed in the ledger on
 * the defensive Donchian family: (1) a fed-funds macro gate that widens the exit
 * to a 60-day low during easing/neutral regimes (holds through bull pullbacks,
 * beats the plain champion on BTC and ETH 1d), and (2) a 2x-average-volume
 * confirmation on the 55-day-high breakout that filters whipsaw and cuts drawdown
 * (beats plain donchian on BTC 1d). This stacks both confirmed edges on the
 * champion's inverse-vol-sized defensive donchian.
 * When it buys and sells: buys a 55-day-high breakout ONLY when today's volume is
 * at least 2x the 20-day average and price is not in a steep EMA50 downtrend,
 * sizing by inverse volatility. Exits on the fed-gated low (60-day in easing,
 * 30-day in hiking) or a 3x-ATR disaster stop.
 * When it does NOT work: if the fed dataset is missing the gate disables (still
 * decent); the stricter volume bar means fewer, later entries so it lags in
 * low-volume silent melt-ups; and it still gives back ground in explosive
 * high-momentum assets like SOL. Pure-price + fed macro, no sentiment data.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  const avgVol = ctx.avgVol(20);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null || ema50 == null || avgVol == null) return null;

  // Fed macro gate: rising sharply = hiking (tight 30-day exit); stable/falling = easing (wider 60-day).
  const fedCur = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  let hiking = null;
  if (fedCur != null && fedLag != null) {
    hiking = fedCur > fedLag + 0.25; // >0.25pp rise in 30d = hiking cycle
  }

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    const exitLow = (hiking === false) ? ll60 : ll30;
    if (price < exitLow) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  const vol = ctx.vol;
  if (vol == null) return null;
  // 2x volume confirmation on the breakout filters low-volume whipsaw (ledger-validated).
  if (price > hh55 && vol > avgVol * 2.0) {
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
