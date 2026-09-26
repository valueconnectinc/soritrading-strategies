/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion ADA 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Tests whether the validated 4h band-bounce mean-reversion
 * champion recipe survives on the DAILY timeframe. The 4h edge is proven across
 * 20+ assets; the 1D evidence is contradictory (LTC +834% vs LTC/XRP weaker), so
 * this runs the EXACT unchanged recipe on a fresh mature asset (ADA) to settle it.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30 while price is above the 200-SMA; exits at the middle band / RSI>50
 * or a 6-ATR stop; waits 5 bars before re-entering.
 * When it does NOT work: 1D bars are slow — a deep lower-band touch that keeps
 * falling still loses, and the 200-SMA gate can keep it in cash through a whole
 * bull run. Daily MDD tends to be higher than 4h because positions are held longer.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
