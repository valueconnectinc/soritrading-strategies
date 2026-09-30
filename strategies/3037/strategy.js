/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing + Deep Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The hybrid-sizing Dual-MR champion (3037) is validated with no losing
 * window, but its one documented weakness is that a full-cash deep-flush entry on a WRONG
 * capitulation bottom (the flush keeps falling) draws down the whole position until the
 * EMA20 snap-back exit. This version keeps every entry and the validated snap-back profit
 * exit identical, and only adds a protective stop-loss on the deep full-cash position so a
 * wrong flush is cut early instead of riding all the way back to the 20-day EMA.
 * When it buys and sells: Same entries as the champion — deep Bollinger flush (RSI<30) buys
 * full cash, ATR-Keltner pullback (RSI<40) buys ATR-sized, both only in a rising 200-day
 * average. Deep positions exit on the snap-back above EMA20 / RSI>55, OR are stopped out if
 * price falls more than 3*ATR below entry (protective cut). Pullback positions keep the
 * snap-back exit only.
 * When it does NOT work: In a normal flush that dips slightly below the stop before snapping
 * back, the stop cuts a position that would have recovered — the stop only helps when flushes
 * genuinely keep falling. Loses to buy-and-hold in a straight melt-up with no flush to enter.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    // Deep full-cash entry: protective stop below entry (cap the wrong-flush cost).
    if (ctx.state.deep === 1 && ctx.state.entryPx > 0) {
      // Stop 3*ATR below the entry price — only for the full-cash deep position.
      if (price < ctx.state.entryPx - 3 * atr) {
        ctx.state.deep = 0;
        return { side: 'sell', qty: pos };
      }
    }
    // Validated snap-back profit exit for all positions.
    if (price > ema20 || rsi > 55) {
      ctx.state.deep = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    ctx.state.deep = 1;
    ctx.state.entryPx = price;
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    ctx.state.deep = 0;
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
