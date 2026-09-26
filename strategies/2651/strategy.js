/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion AVAX 4H (Cooldown)
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family, validated on 12+ assets (LTC/XRP/
 * DOT/ETC/LINK/SOL/ETH/ATOM/UNI/BNB/ADA/BTC). AVAX 4h overreacts to the downside,
 * touches the lower Bollinger band, then snaps back to the mean. Buying the
 * panic-bottom and selling back to the middle captures the snap-back. A 5-bar
 * re-entry cooldown after each exit is the validated improvement on this family
 * (ETC/LTC 1D) — it spaces out repeated falling-knife buys.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30, and only above the 200-SMA; exits at the middle band / RSI>50 or
 * a 6-ATR stop; then waits 5 bars before the next entry.
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

  // Cooldown: wait 5 bars after the last exit before re-entering.
  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
