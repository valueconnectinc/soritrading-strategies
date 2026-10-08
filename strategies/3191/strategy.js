/*
 * @coinsori-strategy v1
 * name: BTC 4H Pure EMA50 Trend (baseline)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: baseline control — a plain 50-EMA trend without any macro filter,
 * used to measure whether adding a DXY gate helps or hurts.
 * When it buys and sells: Buy when price is above its 50-EMA, sell when price drops below.
 * When it does NOT work: In flat chop the 50-EMA cross whipsaws; in a sharp reversal it
 * gives back gains.
 */
function onUpdate(ctx) {
  const ema50 = ctx.ema(50, 1);
  if (ema50 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 2) return null;
  const prevClose = closes[closes.length - 2];

  if (ctx.position > 0 && prevClose < ema50) {
    return { side: 'sell', qty: ctx.position };
  }
  if (ctx.position === 0 && prevClose > ema50) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
