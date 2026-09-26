/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback SOL 4H RegimeFilter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to the VWAP (volume-weighted average
 * price) — in an established uptrend, sharp dips back toward VWAP tend to
 * revert up as buyers step in. This version keeps the moderate volatility-
 * scaled position size from the prior cycle AND adds a longer-term regime
 * filter (price above the 200-SMA) so it does not buy pullbacks in a clear
 * downtrend. That targets the recent bear-window losses without touching
 * the entry/exit timing that carries the edge.
 * When it buys and sells: buys when price pulls back to/below VWAP while the
 * 50-SMA is rising, RSI is not overbought, and price is above the 200-SMA.
 * Sells only on a wide 10-ATR trailing stop or when the 50-SMA turns down.
 * When it does NOT work: fails in a true downtrend below the 200-SMA (no
 * entries at all, so it just sits out) and in low-liquidity chop where VWAP
 * gives no support. The wide stop means large giveback on reversals.
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

  if (pos > 0) {
    const prevSma = ctx.sma(50, 5);
    if (prevSma != null && sma50 < prevSma) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null) {
      s.hi = s.hi == null ? price : Math.max(s.hi, price);
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
  // Long-term regime filter: only buy above the 200-SMA. This keeps us out
  // of deep bear regimes (recent window) where pullbacks keep falling.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  if (price < sma200) return null;
  const lastExit = s.lastExit || 0;
  if (!uptrend) return null;
  if (rsi > 65) return null;
  if (ctx.i - lastExit < 6) return null;
  if (price <= vwap * 1.02) {
    s.hi = price;
    // Moderate vol-scaled sizing: start trimming when ATR/price exceeds 2.5%
    // (elevated, not extreme), scale to a 45% floor at very high vol. This
    // cuts panic-window drawdown while keeping most bull exposure.
    const atr = ctx.atr(14, 1);
    let frac = 0.95;
    if (atr != null && price > 0) {
      const vol = atr / price;
      if (vol > 0.025) frac = Math.max(0.45, 0.95 - (vol - 0.025) * 15);
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }
  return null;
}
