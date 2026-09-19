/*
 * @coinsori-strategy v1
 * name: Stochastic RSI Hybrid
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Stochastic RSI combines RSI and momentum: %K/%D crossover at oversold/overbought
 * zones is a classic mean-reversion signal. This version uses Stochastic %K
 * crossing above %D at oversold (<20) as entry, and crossing below %D at
 * overbought (>80) as exit.
 * Entry: Stoch RSI %K crosses above %D while both are below 20 (oversold bounce).
 * Exit: %K crosses below %D while both are above 80 (overbought exhaustion).
 * When it fails: Strong trends where Stochastic stays overbought/oversold for
 * extended periods — the crossovers never happen at the right time.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  // Track bar transitions
  if (state.lastBarI !== ctx.i) {
    state.prevK = state.lastK ?? null;
    state.prevD = state.lastD ?? null;
    state.lastBarI = ctx.i;
    const stoch = ctx.stoch(14, 3);
    state.lastK = stoch?.k ?? null;
    state.lastD = stoch?.d ?? null;
  } else {
    const stoch = ctx.stoch(14, 3);
    state.lastK = stoch?.k ?? null;
    state.lastD = stoch?.d ?? null;
  }

  const stoch = ctx.stoch(14, 3);
  if (stoch == null || stoch.k == null || stoch.d == null) return null;

  const k = stoch.k;
  const d = stoch.d;
  const prevK = state.prevK;
  const prevD = state.prevD;

  if (prevK == null || prevD == null) return null;

  // Crossover UP at oversold: %K crosses above %D while both below 20
  const crossUp = prevK <= prevD && k > d && k < 20 && d < 20;
  // Crossover DOWN at overbought: %K crosses below %D while both above 80
  const crossDown = prevK >= prevD && k < d && k > 80 && d > 80;

  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.8;

  // Entry
  if (ctx.position === 0) {
    if (crossUp && volOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // Exit
  if (ctx.position > 0) {
    if (crossDown) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
