/*
 * @coinsori-strategy v1
 * name: SOL 4H Keltner MR + Volume Filter
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * SOL mean-reversion is the validated edge (3239, 7/8 positive windows). This is a
 * clean isolation test of ONE addition: require above-average volume on the entry,
 * to filter out dead bounces with no participation. Nothing else changed.
 * When it buys and sells:
 * Buys when the previous close pierced below the Keltner lower band (EMA20 - 2.5xATR)
 * with RSI below 40 AND volume above its 20-bar average. Sells when price returns to
 * the mid-band (EMA20). 2-bar cooldown after exit.
 * When it does NOT work:
 * In strong one-directional moves price can hug the lower band and never revert —
 * this lags buy-and-hold in sustained bull melt-ups.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null || avgVol == null) return null;

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
  // ONLY addition vs 3239: require above-average volume on the entry
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
