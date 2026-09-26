/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion ATOM 4H (ATR-Spike Filter)
 * ex: binance
 * syms: ATOMUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family. ATOM 4h overreacts to the downside,
 * touches the lower Bollinger band, then snaps back to the mean. Buying the
 * panic-bottom and selling back to the middle captures the snap-back. This version
 * adds an ATR-SPIKE filter: if volatility (ATR/price) is extremely elevated, the
 * panic is still accelerating and the falling knife keeps falling, so we wait
 * instead of catching it. A 5-bar re-entry cooldown also spaces out repeated buys.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30 above the 200-SMA AND ATR/price is not in an extreme panic spike;
 * exits at the middle band / RSI>50 or a 6-ATR stop; then waits 5 bars.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies); in a
 * sustained downtrend below the 200-SMA it never buys; an extreme panic that keeps
 * falling still loses (the filter delays, not prevents, the loss). Defensive.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;

  // ATR-spike filter: skip when volatility is extreme (panic still accelerating).
  // atr/pct threshold chosen so normal pullbacks still trade but crash-panics wait.
  const atrPct = atr / price;
  if (atrPct > 0.09) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
