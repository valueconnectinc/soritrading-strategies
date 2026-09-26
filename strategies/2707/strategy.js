/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid MDD-Capped SOL 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The regime-switch hybrid (fear-contrarian bear leg +
 * selective trend bull leg) is the ONE family that captures bull melt-ups,
 * but it had high drawdown (up to 80% on SOL W2). This version keeps both
 * legs but adds a tighter 2xATR hard stop to cap the drawdown, testing
 * whether we can keep the upside while cutting the risk.
 * When it buys and sells: bear leg buys panic bottoms (lower Bollinger +
 * RSI<30); bull leg buys a pullback to the 20-EMA when 20>50 EMA confirms an
 * uptrend. Exits on a 2xATR hard stop, a 50-EMA break, or RSI>70.
 * When it does NOT work: a tight 2xATR stop can get shaken out of strong
 * trends (whipsaw), and in a choppy market both legs may trade too often.
 * Higher risk than the pure defensive champion by design.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || ema20 == null || ema50 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Hard 2xATR stop caps the drawdown (the key change vs the 80%-MDD hybrid).
    if (price <= ctx.entryPx - atr * 2) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (ema20 < ema50) { // uptrend broken
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (rsi > 70) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // BULL leg: pullback to the 20-EMA in a confirmed uptrend.
  if (price > sma200 && ema20 > ema50) {
    if (price <= ema20 * 1.02 && rsi > 40 && rsi < 65) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  // BEAR leg: panic bottom (fear-contrarian).
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
