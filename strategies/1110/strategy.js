/*
 * @coinsori-strategy v1
 * name: EMA Cross 20/60 Plain
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Plain EMA(20)/EMA(60) crossover — no volume filter, no trend filter.
 * Buys on bullish EMA crossover, sells on bearish crossover.
 * Why this strategy: The volume-confirmed version blocked valid signals
 * and returned -3% while BTC +29%. Stripping the filter to let the
 * crossover work freely.
 * When it buys and sells: Enter when fast EMA crosses above slow EMA.
 * Exit on the reverse cross.
 * When it does NOT work: In ranging markets — EMAs oscillate around each
 * other and generate whipsaws with small losses.
 */

function onUpdate(ctx) {
  const fast = 20, slow = 60;
  if (ctx.i < slow + 2) return null;

  const emaF  = ctx.ema(fast);
  const emaS  = ctx.ema(slow);
  const emaF1 = ctx.ema(fast, 1);
  const emaS1 = ctx.ema(slow, 1);
  if (emaF == null || emaS == null || emaF1 == null || emaS1 == null) return null;

  // BUY: bullish EMA crossover
  if (emaF1 <= emaS1 && emaF > emaS && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: bearish EMA crossover
  if (emaF1 >= emaS1 && emaF < emaS && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
