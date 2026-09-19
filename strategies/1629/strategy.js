/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover + Volume Spike
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * A classic dual-EMA trend-following system. Buys when the fast EMA9 crosses
 * above the slow EMA21 (golden cross), confirmed by above-average volume on
 * the signal bar. Exits when price closes below EMA9 (trend degradation).
 * This is a pure trend-riding strategy — no pullback, no regime filter,
 * just momentum and volume.
 * Works best in markets with sustained directional trends.
 * Fails in choppy, low-volume ranges where EMAs cross repeatedly (whipsaw)
 * and in assets with sudden one-day reversal patterns.
 */
function onUpdate(ctx) {
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  if (ema9 == null || ema21 == null) return null;

  // Volume confirmation: today's volume must exceed the 20-bar average.
  const avgVol = ctx.avgVol(20);
  if (avgVol == null || ctx.vol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  // ── EMA crossover signals (ago=1 = previous closed bar, safe for all modes) ──
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9_1 == null || ema21_1 == null) return null;

  // Golden cross: fast EMA crossed above slow EMA in the last bar.
  const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;

  // Death cross: fast EMA crossed below slow EMA — exit signal.
  const deathCross = ema9_1 >= ema21_1 && ema9 < ema21;

  const price = ctx.price;

  // ── Entry ─────────────────────────────────────────────────────────────────
  // Buy on golden cross + volume confirmation + price already above both EMAs.
  if (!ctx.position && goldenCross && volConfirm && price > ema9 && price > ema21) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── Exit ───────────────────────────────────────────────────────────────────
  if (ctx.position) {
    // Exit on death cross (trend reversal)
    if (deathCross) {
      return { side: 'sell', qty: ctx.position };
    }
    // Exit if price drops below EMA21 (trend broken)
    if (price < ema21) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
