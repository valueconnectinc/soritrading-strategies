/*
 * @coinsori-strategy v1
 * name: DOGE 1D Dual-Mode Keltner MR + Trend Ride
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion core is the one robust
 * edge in this ledger (positive on nearly every window across 9+ assets). Its single
 * documented weakness is missing a relentless melt-up: it sits in cash waiting for a
 * pullback while the market runs away. This version keeps the proven MR core for
 * oversold pullbacks AND adds a trend-ride mode that holds through a strong uptrend,
 * so it captures both regimes.
 * When it buys and sells: MR mode buys an oversold flush below EMA20-2.5xATR with
 * RSI<40 inside a rising 200-day uptrend (full cash), sells on snap-back above EMA20
 * or RSI>60. Trend mode buys when price is above EMA20 and the 200-day is climbing
 * steeply (signalling a real melt-up), holds while RSI stays strong, sells when RSI
 * turns overbought-weak.
 * When it does NOT work: In a chop or slow grind the trend mode churns (whipsaw) and
 * can give back the MR edge; a meme asset can still gap down hard. MDD stays moderate
 * but this is not a capital-preservation machine in a slow bear.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null) return null;

  const lowerBand = ema20 - 2.5 * atr;
  const uptrend = sma200 > sma200prev;
  // Melt-up signal: 200-day rising AND price comfortably above the mid band.
  // A steep climb is a strong uptrend worth riding, not a pullback to fade.
  const meltUp = uptrend && price > ema20 && (price - ema20) / atr > 2.0;

  if (pos > 0) {
    // Exit: MR position exits on snap-back; trend position exits when RSI fades.
    if (price > ema20 && rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    // Hard stop: never let a winning position turn into a big loss.
    if (ctx.entryPx != null && price < ctx.entryPx * 0.85) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // MR entry: deep oversold flush in an uptrend (the proven core).
  if (uptrend && price < lowerBand && rsi < 40) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  // Trend entry: melt-up mode — ride the strong uptrend.
  if (meltUp && rsi > 55) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
