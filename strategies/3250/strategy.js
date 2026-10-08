/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR + Fear-Greed Gate
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * Combines two ideas: the validated Keltner mean-reversion recipe (buy oversold,
 * sell at mid-band) and the user's own fear-greed index as a sentiment gate.
 * The gate blocks MR entries when greed is extreme (index >= 70) — those dips
 * rarely revert because the crowd is still buying.
 * When it buys and sells:
 * Buys when the previous close pierced below the Keltner lower band (EMA20 - 2.5xATR)
 * with RSI<40 AND fear-greed index below 70. Sells when price returns to the mid-band
 * (EMA20). 2-bar cooldown between trades.
 * When it does NOT work:
 * In strong one-directional moves price hugs the lower band and never reverts — lags
 * buy-and-hold in sustained bull melt-ups. The sentiment gate does not rescue a
 * prolonged bear. 1d data from 2018 (fear-greed index range) limits the test window.
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
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower && fg < 70) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
