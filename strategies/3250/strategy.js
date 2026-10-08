/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR + Tight FG Gate
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * The validated Keltner MR recipe (buy oversold, sell at mid-band) with a TIGHTER
 * fear-greed gate (index < 55, i.e. only buy when sentiment is not already greedy).
 * A loose gate (fg<70) was a no-op — MR entries happen when the index is low anyway.
 * This version only enters when the sentiment reading confirms the dip is a fear dip.
 * When it buys and sells:
 * Buys when previous close pierced below Keltner lower band (EMA20 - 2.5ATR) with
 * RSI<40 AND fear-greed index below 55. Sells at mid-band EMA20. 2-bar cooldown.
 * When it does NOT work:
 * Strong one-directional moves never revert. In a melt-up the index stays high so few
 * entries fire and it lags buy-and-hold badly. Prolonged bear also hurts.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  const fg = ctx.data('fear_greed');
  if (ema == null || atr == null || rsi == null || price == null || fg == null) return null;

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
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower && fg < 55) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
