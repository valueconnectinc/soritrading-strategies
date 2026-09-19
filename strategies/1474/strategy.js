/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI ATR Filter v3
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA9/21 crossover catches medium-term trend shifts.
 * RSI confirms momentum health and avoids false signals; ATR rising confirms
 * the move has real force behind it, not just a whipsaw.
 * When it buys and sells: Buy when EMA9 crosses above EMA21, RSI is between
 * 40-70 (not overheated), and ATR is above its 10-bar SMA (volatility expanding).
 * Sell when EMA9 crosses back below EMA21 or RSI hits 65+ (overbought).
 * When it does NOT work: In choppy markets where EMAs cross repeatedly —
 * the RSI/ATR filters help but cannot eliminate whipsaws entirely.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  // Track bar transitions for prev-bar comparisons
  if (state.lastBarI !== ctx.i) {
    state.prevEma9  = state.lastEma9  ?? null;
    state.prevEma21 = state.lastEma21 ?? null;
    state.lastBarI  = ctx.i;
    state.lastEma9  = ctx.ema(9);
    state.lastEma21 = ctx.ema(21);
  } else {
    state.lastEma9  = ctx.ema(9);
    state.lastEma21 = ctx.ema(21);
  }

  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);
  const avgAtr = ctx.atr(14, 10); // ATR SMA(10) for volatility filter

  if (ema9 == null || ema21 == null || rsi == null || atr == null || avgAtr == null) return null;
  if (state.prevEma9 == null || state.prevEma21 == null) return null;

  // Crossover: EMA9 crossed ABOVE EMA21 this bar
  const crossUp = state.prevEma9 <= state.prevEma21 && ema9 > ema21;
  // Cross down: EMA9 crossed BELOW EMA21
  const crossDown = state.prevEma9 >= state.prevEma21 && ema9 < ema21;

  // RSI filters: not overheated (below 70), not dead (above 40)
  const rsiOk = rsi > 40 && rsi < 70;
  const rsiOverbought = rsi > 65;

  // ATR expanding (momentum confirmed by volatility)
  const atrExpanding = atr > avgAtr;

  // Volume above average
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk = avgVol != null && vol != null && vol > avgVol;

  // --- Entry ---
  if (ctx.position === 0) {
    if (crossUp && rsiOk && atrExpanding && volOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // --- Exit ---
  if (ctx.position > 0) {
    if (crossDown || rsiOverbought) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
