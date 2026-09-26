/*
 * @coinsori-strategy v1
 * name: Fed+Panic-Gated Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion (fed-gated defensive Donchian) widens
 * its exit to a 60-day low during easing/neutral fed regimes to ride bull
 * pullbacks. Its documented weakness: that wide exit can ride through real
 * crashes (2018 bear, 2020 COVID) that happened during easing. This version adds
 * a fear/greed panic filter: even during easing, if the fear/greed index collapses
 * into extreme panic, we tighten the exit so we bail before a crash deepens.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility. Exits on a 30-day low or 3x-ATR stop
 * in hiking; in easing/neutral it uses a 60-day low UNLESS fear/greed is in
 * panic, in which case it tightens back to the 30-day low (crash protection).
 * When it does NOT work: if the fed or fear_greed datasets are missing, the gates
 * disable and it degenerates toward the plain champion (still decent). The panic
 * filter may exit a normal bull shakeout early if fear/greed spikes low without a
 * real crash following. Macro-hybrid, not a pure price strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null || ema50 == null) return null;

  // Fed macro gate: current rate vs its 30-day-ago level. Rising sharply = hiking.
  const fedCur = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  let hiking = null; // null = no data, gate disabled -> default to tight exit
  if (fedCur != null && fedLag != null) {
    hiking = fedCur > fedLag + 0.25; // >0.25pp rise in 30d = hiking cycle
  }

  // Fear/greed panic filter: extreme fear (<20) signals a panic regime. During
  // easing we normally widen the exit, but a panic collapse overrides that and
  // tightens back to the 30-day low so we don't ride a crash.
  const fg = ctx.data('fear_greed');
  const panic = (fg != null) ? (fg < 20) : false; // FG<20 = extreme fear

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Disaster stop always active.
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // Widen exit only in easing AND not in panic; otherwise keep tight 30-day.
    const widen = (hiking === false) && !panic;
    const exitLow = widen ? ll60 : ll30;
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
