/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to VWAP. In an established uptrend, sharp
 * dips back toward the volume-weighted average price tend to revert up as
 * buyers step in. ETH version of the SOL champion recipe, with a stricter
 * entry (price must actually reach VWAP) to cut the churn the loose 1.02
 * threshold caused (204 trades vs SOL's ~70).
 * When it buys and sells: buys when price pulls back to/below VWAP while the
 * 50-SMA is rising, RSI is turning up and below 65, and price is above the
 * 200-SMA. Sells on a 10-ATR trailing stop, when the 50-SMA turns down, after
 * a 24-bar time stop, or takes partial profit at +3 ATR.
 * When it does NOT work: fails in a true downtrend below the 200-SMA (sits out
 * entirely) and in low-liquidity chop where VWAP gives no support. The wide
 * stop means large giveback on sharp reversals. Lags strong melt-ups.
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
  if (atr == null) return null;

  if (pos > 0) {
    if (s.entryBar != null && ctx.i - s.entryBar >= 24) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (s.tookTP == null && price >= ctx.entryPx + atr * 3) {
      s.tookTP = true;
      return { side: 'sell', qty: pos * 0.5 };
    }
    const prevSma = ctx.sma(50, 5);
    if (prevSma != null && sma50 < prevSma) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    s.hi = s.hi == null ? price : Math.max(s.hi, price);
    if (price <= s.hi - atr * 10) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const prevSma = ctx.sma(50, 5);
  if (prevSma == null) return null;
  const uptrend = sma50 > prevSma;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  if (price < sma200) return null;
  const lastExit = s.lastExit || 0;
  if (!uptrend) return null;
  if (rsi > 65) return null;
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null || rsi <= rsiPrev) return null;
  if (ctx.i - lastExit < 6) return null;
  // stricter: price must actually reach VWAP to cut churn on ETH
  if (price > vwap) return null;
  s.hi = price;
  s.tookTP = null;
  s.entryBar = ctx.i;
  let frac = 0.95;
  if (price > 0) {
    const vol = atr / price;
    if (vol > 0.025) frac = Math.max(0.45, 0.95 - (vol - 0.025) * 15);
  }
  return { side: 'buy', qty: ctx.cash / ctx.price * frac };
}
