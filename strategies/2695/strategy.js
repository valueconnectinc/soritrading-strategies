/*
 * @coinsori-strategy v1
 * name: Band-Bounce Baseline DOT 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The un-gated champion band-bounce recipe on DOT 4h, used
 * as a CONTROL to isolate whether the Fear-Greed gate adds value. No external
 * data. Same entry/exit as the champion.
 * When it buys and sells: buys below lower Bollinger(20,2) with RSI<30 above the
 * 200-SMA; exits at the middle band / RSI>50 or a 6-ATR stop; waits 5 bars.
 * When it does NOT work: lags strong melt-ups; below the 200-SMA never buys;
 * a panic that keeps falling still loses.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
