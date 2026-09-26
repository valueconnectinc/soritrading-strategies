/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback SOL 4H SoftRegime+TP+Breakeven
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to the VWAP (volume-weighted average
 * price) — in an established uptrend, sharp dips back toward VWAP tend to
 * revert up as buyers step in. Builds on the soft-regime + partial-take-profit
 * version and adds a BREAKEVEN stop: once price climbs ~3 ATR from entry we
 * bank a third of the position and immediately move the stop up to entry, so
 * the remaining two-thirds can never turn into a loss. This cuts the giveback
 * that drove drawdown on the middle window without capping the trend upside.
 * When it buys and sells: buys when price pulls back to/below VWAP while the
 * 50-SMA is rising, RSI is not overbought, and the 200-SMA is not declining.
 * Banks a third at +3 ATR, then stops the rest at breakeven, then on the
 * 50-SMA turn-down or a 10-ATR trailing stop.
 * When it does NOT work: fails in a true downtrend (pullbacks keep falling)
 * and in low-liquidity chop where VWAP gives no support.
 */
function onUpdate(ctx) {
  const s = ctx.state;
  const price = ctx.price;
  const pos = ctx.position;
  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  if (rsi == null || sma50 == null) return null;

  const n = 50;
  if (ctx.i < n) return null;
  let pv = 0, vsum = 0;
  for (let k = 1; k <= n; k++) {
    const tp = (ctx.high(k) + ctx.low(k) + ctx.closes[ctx.closes.length - 1 - k]) / 3;
    const v = ctx.volumes[ctx.volumes.length - 1 - k];
    if (tp == null || v == null) continue;
    pv += tp * v;
    vsum += v;
  }
  if (vsum === 0) return null;
  const vwap = pv / vsum;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    const prevSma = ctx.sma(50, 5);
    if (prevSma != null && sma50 < prevSma) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (atr != null) {
      s.hi = s.hi == null ? price : Math.max(s.hi, price);
      // Partial take-profit: at +3 ATR bank a third of the position.
      if (s.entry != null && !s.halfTaken) {
        if (price >= s.entry + atr * 3) {
          s.halfTaken = true;
          s.be = true; // breakeven stop armed after banking the third
          return { side: 'sell', qty: pos / 3 };
        }
      }
      // Breakeven stop: after the partial, never let the rest turn to a loss.
      // This is the MDD killer — it caps giveback once we are in profit.
      if (s.be && price <= s.entry) {
        s.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      if (price <= s.hi - atr * 10) {
        s.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  const prevSma = ctx.sma(50, 5);
  if (prevSma == null) return null;
  const uptrend = sma50 > prevSma;
  // Soft regime filter: block entries only when the 200-SMA is declining.
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;
  if (sma200 < sma200prev) return null;
  const lastExit = s.lastExit || 0;
  if (!uptrend) return null;
  if (rsi > 65) return null;
  if (ctx.i - lastExit < 6) return null;
  if (price <= vwap * 1.02) {
    s.hi = price;
    s.halfTaken = false;
    s.be = false;
    s.entry = price;
    // Moderate vol-scaled sizing: trim when ATR/price exceeds 2.5%, floor 45%.
    let frac = 0.95;
    if (atr != null && price > 0) {
      const vol = atr / price;
      if (vol > 0.025) frac = Math.max(0.45, 0.95 - (vol - 0.025) * 15);
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }
  return null;
}
