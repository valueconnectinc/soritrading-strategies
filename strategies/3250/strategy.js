/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR Base (no gate)
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Control group to measure whether the fear-greed gate adds value
 * to the validated Keltner MR recipe on BTC 1d. Identical logic except no sentiment gate.
 * When it buys and sells: Buys when previous close pierced below Keltner lower band
 * (EMA20 - 2.5ATR) with RSI<40. Sells at mid-band EMA20. 2-bar cooldown.
 * When it does NOT work: Same as the recipe — strong one-directional moves.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null || price == null) return null;

  const lower = ema - 2.5 * atr;

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
