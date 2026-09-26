/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion VET 4H
 * ex: binance
 * syms: VETUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion recipe — VET 4h overreacts to the
 * downside, touches the lower Bollinger band, then snaps back to the mean.
 * This family has been confirmed positive on 18 assets at 4H; VET is a fresh
 * generalization test.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30 above the 200-SMA; exits at the middle band / RSI>50 or a stop;
 * then waits 5 bars before the next entry.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies);
 * in a sustained downtrend below the 200-SMA it never buys; a panic that keeps
 * falling still loses. Mean reversion is defensive, not a trend rider.
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
