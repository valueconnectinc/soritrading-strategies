/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback SOL 4H MomentumEntry+MidVolSize+TimeStop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion to the VWAP in an established uptrend —
 * sharp dips toward VWAP tend to revert up as buyers step in. This version
 * adds a MOMENTUM CONFIRMATION (only buy when RSI is turning up), middle
 * vol-scaling, partial take-profit at +4 ATR, and a soft 200-SMA regime filter.
 * NEW this cycle: raise the partial take-profit from +3 ATR to +4 ATR so winning
 * reversion trades run a little further before the first third is taken — and
 * keep the 24-bar time-stop that cuts the "grinder" trades.
 * When it buys and sells: buys when price pulls back to/below VWAP*1.02, 50-SMA
 * rising, 200-SMA not declining, RSI not overbought AND RSI turning up. Sells a
 * third at +4 ATR, then the rest on the 50-SMA turn-down, 10-ATR trail, or the
 * 24-bar time-stop.
 * When it does NOT work: fails in a true downtrend (pullbacks keep falling) and
 * in low-liquidity chop where VWAP gives no support.
 */
function onUpdate(ctx) {
  const s = ctx.state;
  const price = ctx.price;
  const pos = ctx.position;
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  const sma50 = ctx.sma(50, 1);
  if (rsi == null || rsiPrev == null || sma50 == null) return null;

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
      if (s.entry != null && !s.halfTaken) {
        if (price >= s.entry + atr * 4) {
          s.halfTaken = true;
          return { side: 'sell', qty: pos / 3 };
        }
      }
      // TIME-STOP: if held too long without reaching the +4 ATR target, bail.
      // 24 bars ~ 4 days on 4h — enough for a real reversion, cuts grinders.
      if (s.entry != null && !s.halfTaken && ctx.i - s.entryBar > 24) {
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
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;
  if (sma200 < sma200prev) return null;
  const lastExit = s.lastExit || 0;
  if (!uptrend) return null;
  if (rsi > 65) return null;
  if (rsi <= rsiPrev) return null;
  if (ctx.i - lastExit < 6) return null;
  if (price <= vwap * 1.02) {
    s.hi = price;
    s.halfTaken = false;
    s.entry = price;
    s.entryBar = ctx.i;
    let frac = 0.95;
    if (atr != null && price > 0) {
      const vol = atr / price;
      if (vol > 0.022) frac = Math.max(0.38, 0.95 - (vol - 0.022) * 18);
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }
  return null;
}
