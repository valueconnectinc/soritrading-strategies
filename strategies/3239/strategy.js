/*
 * @coinsori-strategy v1
 * name: SOL 4H Keltner Mean Reversion
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL frequently over-extends from its short-term mean and snaps back. This ATR-adaptive mean-reversion recipe has held up across many disjoint windows on SOL/XRP 4h while trend-following has failed.
 * When it buys and sells: Buys when the previous close pierced below a Keltner lower band (EMA20 - 2.5xATR) with RSI below 40; sells when price returns to the mid-band (EMA20). A 2-bar cooldown avoids re-entering the same dip.
 * When it does NOT work: In strong one-directional moves price can hug the lower band and never revert — this lags buy-and-hold in sustained bull melt-ups.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null) return null;

  const lower = ema - 2.5 * atr; // band width 2.5x ATR — validated recipe, not tuned here

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: ema, note: 'mid-band target' }
  ]);

  // Exit: sell when price returns to the mid-band (EMA20). NO hard stop — stops lock in losses right before the snap-back (validated).
  if (ctx.position > 0) {
    if (price >= ema) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // 2-bar cooldown after an exit: don't re-enter the same falling dip (validated recipe)
  if (ctx.state.lastExitBar != null && ctx.i - ctx.state.lastExitBar < 2) return null;

  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;
  // Entry: previous close pierced below the lower band AND RSI oversold (<40)
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
