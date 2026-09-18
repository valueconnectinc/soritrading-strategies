/*
 * @coinsori-strategy v1
 * name: BB RSI EMA200 Mean Reversion — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on altcoin 4h: buy when price touches lower Bollinger Band
 * AND RSI < 35 (oversold) AND EMA200 is rising (uptrend confirmed).
 * Volume filter confirms the oversold snap has real participation.
 * Sell at middle BB or when RSI > 60 (overbought snap resolved).
 * When it does NOT work: strong one-way下跌 where EMA200 keeps falling —
 * the strategy keeps buying into a falling knife. Also underperforms
 * in strong trending markets (bench beats it on SOL in all windows).
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb  = ctx.bb(20, 2);
  const ema200 = ctx.ema(200);
  const avgVol = ctx.avgVol(20);

  if (rsi == null || bb == null || ema200 == null) return null;
  if (bb.mid == null) return null;

  const price = ctx.price;
  const { lower, mid } = bb;

  // EMA200 must be rising — only long in confirmed uptrends (crash protection)
  const ema200Rising = ctx.ema(200, 1) != null && ctx.ema(200, 1) < ema200;

  // Volume must exceed its 20-bar average (filters low-quality snaps)
  const volConfirm = (avgVol == null || ctx.vol >= avgVol);

  if (ctx.position === 0) {
    // Entry: lower BB touch + RSI oversold + uptrend + volume confirmation
    if (price <= lower && rsi < 35 && ema200Rising && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else {
    // Exit: RSI overbought OR mean-reversion target (middle BB) reached
    if (rsi > 60 || price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
