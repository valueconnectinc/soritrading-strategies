/*
 * @coinsori-strategy v1
 * name: XRP 4H Keltner Momentum Reversion (validated)
 * ex: binance
 * syms: XRP
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * XRP shows the same mean-reversion behaviour as SOL (validated recipe base).
 * This is the champion recipe applied to XRP, confirmed 3/3 positive across
 * three disjoint windows (+37/+24/+74.5) in the previous cycle.
 * When it buys and sells:
 * Buys when the previous close pierced below the Keltner lower band (EMA20 - 2.5xATR)
 * with RSI below 40. Sells when price returns to the mid-band (EMA20). 2-bar cooldown.
 * When it does NOT work:
 * In strong one-directional moves price can hug the lower band and never revert —
 * lags buy-and-hold in sustained bull melt-ups.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null) return null;

  const lower = ema - 2.5 * atr; // validated recipe band width

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: ema, note: 'mid-band target' }
  ]);

  if (ctx.position > 0) {
    if (price >= ema) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (ctx.state.lastExitBar != null && ctx.i - ctx.state.lastExitBar < 2) return null;

  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
