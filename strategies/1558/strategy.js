/*
 * @coinsori-strategy v1
 * name: MACD Crossover + RSI Trend Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: MACD crossover is a classic momentum signal. By adding an
 * RSI trend filter (only buy when RSI > 40 = confirming uptrend), we avoid
 * buying into weak momentum or counter-trend moves.
 * When it buys and sells: Buys when MACD crosses above signal line AND RSI(14)
 * is above 40 (trend confirming). Sells when MACD crosses below signal line.
 * When it does NOT work: In choppy markets with frequent MACD whipsaws; or when
 * RSI is in a persistently low range (bear markets) — the filter prevents entries
 * at exactly the wrong time for mean-reversion.
 */
function onUpdate(ctx) {
  // ── Warm-up ────────────────────────────────────────────────────────────────
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const macd = ctx.macd(12, 26, 9);
  if (macd == null) return null;

  // ── Previous bar MACD (for crossover detection) ────────────────────────────
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const signalPrev = macdPrev && macdPrev.signal;
  if (macdPrev == null || signalPrev == null) return null;

  // ── MACD Bullish Crossover: MACD was below signal, now above ───────────────
  const bullCross = macdPrev.macd <= signalPrev && macd.macd > macd.signal;

  // ── RSI Trend Filter: only buy when RSI > 40 (uptrend confirmation) ────────
  const rsiConfirm = rsi > 40;

  // ── Entry ─────────────────────────────────────────────────────────────────
  if (bullCross && rsiConfirm && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── MACD Bearish Crossover: exit when MACD crosses below signal ────────────
  const bearCross = macdPrev.macd >= signalPrev && macd.macd < macd.signal;

  if (bearCross && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
