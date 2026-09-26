/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback SOL 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to the VWAP (volume-weighted average
 * price) — in an established uptrend, sharp dips back toward VWAP tend to
 * revert up as buyers step in. The prior VWAP-pullback version returned
 * strongly on SOL but with 63-88% drawdown; this version adds a tight
 * trailing stop and an overextension exit to control risk.
 * When it buys and sells: buys when price pulls back to/below VWAP while the
 * 50-SMA is rising and RSI is not overbought. Sells when price recovers above
 * VWAP, when RSI exceeds 70 (overextension), or on a 4-ATR trailing stop.
 * When it does NOT work: fails in a true downtrend (pullbacks keep falling)
 * and in low-liquidity chop where VWAP gives no support. The tight stop cuts
 * winners short in fast melt-ups.
 */
function onUpdate(ctx) {
  const s = ctx.state;
  const price = ctx.price;
  const pos = ctx.position;
  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  if (rsi == null || sma50 == null) return null;

  // VWAP proxy: cumulative typical-price * volume over a 50-bar window.
  // Recompute the rolling VWAP on each bar.
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

  if (pos > 0) {
    // Overextension exit: lock gains when RSI gets hot.
    if (rsi > 70) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // Reversion target: back above VWAP.
    if (price > vwap) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // Tight trailing stop: 4-ATR from the highest price since entry.
    const atr = ctx.atr(14, 1);
    if (atr != null) {
      s.hi = s.hi == null ? price : Math.max(s.hi, price);
      if (price <= s.hi - atr * 4) {
        s.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  // Entry: uptrend (rising 50-SMA), not overbought, price dipped to/below VWAP.
  const prevSma = ctx.sma(50, 5);
  if (prevSma == null) return null;
  const uptrend = sma50 > prevSma;
  const lastExit = s.lastExit || 0;
  if (!uptrend) return null;
  if (rsi > 65) return null;
  if (ctx.i - lastExit < 6) return null;
  if (price <= vwap * 1.02) {
    s.hi = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
