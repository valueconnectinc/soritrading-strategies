/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: BTCUSDT 1h shows clear EMA crossover signals with less noise than
 * lower timeframes. Adding an RSI filter (not at extremes) avoids entries during
 * exhausted moves and reduces whipsaws. This is a proven trend-following setup.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 AND RSI(14) is between 40-70
 * (not overbought, trend has room). Sell when EMA9 crosses below EMA21.
 * When it does NOT work: In choppy, directionless markets EMA crossovers generate
 * frequent false signals and the RSI filter cannot prevent all whipsaws.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);

  if (ema9 == null || ema21 == null || rsi == null) return null;

  // ── Previous bar values (closed bars — stable, no repainting) ───────────────
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);

  if (ema9_1 == null || ema21_1 == null) return null;

  // ── Crossover detection ──────────────────────────────────────────────────────
  const bullCross = ema9_1 <= ema21_1 && ema9 > ema21; // EMA9 crosses above EMA21
  const bearCross = ema9_1 >= ema21_1 && ema9 < ema21; // EMA9 crosses below EMA21

  // ── RSI filter: avoid entries when market is exhausted ─────────────────────
  // Long only when RSI is 40-70 (neutral zone — room to run)
  // Short only when RSI is 30-60
  const rsiOkLong  = rsi >= 40 && rsi <= 70;
  const rsiOkShort = rsi >= 30 && rsi <= 60;

  // ── Position state ──────────────────────────────────────────────────────────
  const pos = ctx.position;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0 && bullCross && rsiOkLong) {
    const qty = ctx.cash / ctx.price * 0.99;
    return { side: 'buy', qty };
  }

  // ── Entry: Short ───────────────────────────────────────────────────────────
  if (pos === 0 && bearCross && rsiOkShort) {
    const qty = ctx.cash / ctx.price * 0.99;
    return { side: 'sell', qty };
  }

  // ── Exit: close long on bear cross ──────────────────────────────────────────
  if (pos > 0 && bearCross) {
    return { side: 'sell', qty: pos };
  }

  // ── Exit: close short on bull cross ────────────────────────────────────────
  if (pos < 0 && bullCross) {
    return { side: 'buy', qty: Math.abs(pos) };
  }

  return null;
}
