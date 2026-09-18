/*
 * @coinsori-strategy v1
 * name: EMA Crossover Momentum 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC trends strongly — riding momentum with EMA crossovers
 * captures big moves and avoids the whipsaws that kill mean-reversion on crypto.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 with RSI > 50
 * (uptrend confirmation). Sells when EMA9 crosses below EMA21 (trend reversal).
 * When it does NOT work: Choppy range-bound markets — multiple false signals
 * and small losses accumulate. Also fails on the initial trend misidentification.
 */

function onUpdate(ctx) {
  // Warm-up guard — need at least 21 bars for EMA21
  const ema9     = ctx.ema(9,  1);
  const ema21    = ctx.ema(21, 1);
  const ema9p    = ctx.ema(9,  2);
  const ema21p   = ctx.ema(21, 2);
  const rsi      = ctx.rsi(14, 1);
  const rsip     = ctx.rsi(14, 2);

  if (ema9 == null || ema21 == null || ema9p == null || ema21p == null) return null;
  if (rsi == null || rsip == null) return null;

  // === ENTRY: EMA9 crosses above EMA21 (golden cross) + RSI confirms uptrend
  // RSI > 50 means price is in positive momentum — avoid buying into weakness
  const goldenCross = ema9p <= ema21p && ema9 > ema21;
  const rsiConfirm  = rsi  >  50        && rsip <= 50;

  // === EXIT: EMA9 crosses below EMA21 (death cross) — trend reversal
  const deathCross = ema9p >= ema21p && ema9 < ema21;

  const hasPos = ctx.position > 0;

  // BUY: no position + golden cross + RSI confirms momentum
  if (!hasPos && goldenCross && rsiConfirm) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: have position + death cross
  if (hasPos && deathCross) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
