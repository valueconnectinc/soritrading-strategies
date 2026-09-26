/*
 * @coinsori-strategy v1
 * name: Trend-Scaled Band-Bounce BCH 1D
 * ex: binance
 * syms: BCHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Generalization test of the trend-scaled band-bounce
 * improvement (validated on XRP 1d: nearly doubled the bull-window return
 * without hurting bear defense). The base band-bounce champion is robust on
 * 25+ assets; this adds a trend-strength-scaled RSI entry to fix its known
 * bull-lagging weakness. BCH is a second fresh asset to rule out overfit.
 * When it buys and sells: buys on a band-bounce; strict (RSI<30, lower band)
 * near/below the 200-SMA, loose (RSI<45, middle band) when price is >=30%
 * above the 200-SMA. Exits at the middle band / RSI>50 or a 6-ATR stop.
 * When it does NOT work: in a violent crash below the 200-SMA it still buys
 * falling knives; the looser bull entries add whipsaw risk in a choppy uptrend.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;

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

  const bullDepth = price / sma200;
  if (bullDepth >= 1.30) {
    if (price <= bb.mid && rsi < 45) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
