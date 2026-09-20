/*
 * @coinsori-strategy v1
 * name: SOL Donchian Breakout ATR-Trailing 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: pure momentum/breakout family — different from the validated
 * vol-target champion. SOL's strong trending phases reward buying new 20-day
 * highs and riding with a trailing stop rather than vol-scaled sizing.
 * When it buys and sells: buy when price closes above the 20-day high (Donchian
 * breakout); sell when price closes below the 10-day low or drops 2.5 ATR from
 * the entry.
 * When it does NOT work: in choppy/range-bound markets the breakout is repeatedly
 * faked and the trailing stop gives back gains; SOL's volatility means frequent
 * stop-outs during normal pullbacks.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  const entryPx = ctx.entryPx;
  const atr = ctx.atr(14, 1);
  // Donchian: rolling 20-day high / 10-day low from CLOSED bars (ago>=1).
  const hh20 = ctx.high(20, 1);
  const ll10 = ctx.low(10, 1);
  if (price == null || atr == null || hh20 == null || ll10 == null || price <= 0) return null;

  // Trailing stop: 2.5 ATR below the highest price since entry. Chosen to give a
  // normal SOL pullback room while still locking in most of a trend.
  const stopPx = pos > 0 && entryPx != null ? (price - 2.5 * atr) : null;

  if (pos <= 0) {
    // Flat: buy on breakout above the 20-day high.
    if (price > hh20) {
      const qty = (cash / price) * 0.98;
      if (qty <= 0) return null;
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  // In position: exit on 10-day low break or trailing stop.
  if (price < ll10 || (stopPx != null && price < stopPx)) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
