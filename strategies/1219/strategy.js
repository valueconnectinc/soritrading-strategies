/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion v5 — ETHUSDT 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * ETHUSDT 4h mean reversion: buy when price touches lower BB + RSI<35 + EMA200 confirms uptrend.
 * Adds volume filter — only enter when current volume exceeds the 20-bar average volume,
 * ensuring the oversold snap has real market participation behind it.
 * Sell at middle BB or when RSI>60 (overbought snap resolved).
 * When it does NOT work: sharp one-way crashes where EMA200 keeps falling and RSI
 * stays depressed — the strategy keeps buying into a falling knife.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2);
  const ema200 = ctx.ema(200);
  const avgVol = ctx.avgVol(20);

  if (rsi == null || bb == null || ema200 == null) return null;
  if (bb.mid == null) return null;

  const price = ctx.price;
  const { lower, mid } = bb;

  // Trend filter: EMA200 must be rising — only long in confirmed uptrends
  const ema200Rising = ctx.ema(200, 1) != null && ctx.ema(200, 1) < ema200;

  // Volume filter: current bar volume must exceed its 20-bar average
  // avgVol == null means not enough bars — skip filter in that case
  const volConfirm = (avgVol == null || ctx.vol >= avgVol);

  if (ctx.position === 0) {
    // Entry: price at/below lower BB + RSI oversold + uptrend + volume confirmation
    if (price <= lower && rsi < 35 && ema200Rising && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  if (ctx.position > 0) {
    // Exit: RSI overbought OR price reached middle BB (mean reversion target)
    if (rsi > 60 || price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
