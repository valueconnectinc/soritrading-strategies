/*
 * @coinsori-strategy v1
 * name: EMA Crossover + Volume + ATR Exit
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Builds on the promising EMA(8,21)+volume strategy (exp 371)
 * by adding a take-profit rule. The original lost in bull markets (window 3)
 * because the EMA exit is lagging — taking profits at a fixed ATR multiple
 * should lock in gains before the trend reverses.
 * When it buys and sells: Same entry as exp 371 (EMA crossover + volume surge).
 * Exits on EMA bear cross OR when price reaches entry + 3× ATR (take profit).
 * When it does NOT work: In choppy markets where price hits the ATR take-profit
 * repeatedly but then reverses — gives back small profits with many whipsaws.
 */
function onUpdate(ctx) {
  // ── Warm-up ────────────────────────────────────────────────────────────────
  const ema8  = ctx.ema(8);
  const ema21 = ctx.ema(21);
  if (ema8 == null || ema21 == null) return null;

  const e8p  = ctx.ema(8,  1);
  const e21p = ctx.ema(21, 1);
  if (e8p == null || e21p == null) return null;

  // ── Volume ─────────────────────────────────────────────────────────────────
  const volSMA = ctx.avgVol(20);
  if (volSMA == null) return null;
  const volSurge = ctx.vol > volSMA * 1.5;

  // ── Entry ───────────────────────────────────────────────────────────────────
  const bullCross = e8p <= e21p && ema8 > ema21;
  if (bullCross && volSurge && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Exit conditions ────────────────────────────────────────────────────────
  const bearCross = e8p >= e21p && ema8 < ema21;

  // Take profit: price moved entry + 3× ATR
  const atr = ctx.atr(14);
  let takeProfit = false;
  if (atr != null && ctx.entryPx != null) {
    takeProfit = ctx.price >= ctx.entryPx + 3 * atr;
  }

  if (ctx.position > 0) {
    if (bearCross) return { side: 'sell', qty: ctx.position };
    if (takeProfit) return { side: 'sell', qty: ctx.position };
  }

  return null;
}
