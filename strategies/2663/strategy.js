/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback SOL 4H SoftRegime+TP+AggVolSize
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to the VWAP (volume-weighted average
 * price) — in an established uptrend, sharp dips back toward VWAP tend to
 * revert up as buyers step in. Builds on the soft-regime + partial-take-profit
 * champion and makes the volatility-scaled sizing MORE aggressive: we start
 * trimming position size at 2% ATR/price (was 2.5%) and floor at 30% (was
 * 45%). The champion's window-2 (2022-24) MDD of ~34% comes from the 2022
 * crash, so cutting exposure harder in high-vol regimes should reduce that
 * drawdown without touching the well-tuned exit rules.
 * When it buys and sells: buys when price pulls back to/below VWAP while the
 * 50-SMA is rising, RSI is not overbought, and the 200-SMA is not declining.
 * Sells a third at +3 ATR, then the rest on the 50-SMA turn-down or 10-ATR.
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
      // Mild partial take-profit: at +3 ATR bank a third of the position.
      if (s.entry != null && !s.halfTaken) {
        if (price >= s.entry + atr * 3) {
          s.halfTaken = true;
          return { side: 'sell', qty: pos / 3 };
        }
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
    s.entry = price;
    // Aggressive vol-scaled sizing: start trimming at 2% ATR/price (was 2.5%),
    // floor at 30% (was 45%). Cuts exposure harder in crash regimes that drive
    // window-2 MDD, while keeping full size in calm bull trends.
    let frac = 0.95;
    if (atr != null && price > 0) {
      const vol = atr / price;
      if (vol > 0.02) frac = Math.max(0.30, 0.95 - (vol - 0.02) * 20);
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }
  return null;
}
