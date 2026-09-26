/*
 * @coinsori-strategy v1
 * name: Regime-Switching Trend + Mean-Reversion BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Two proven price behaviours on one asset, chosen by regime.
 * In a bull regime (price above a rising 200-SMA) BTC tends to keep trending, so we
 * ride pullbacks to the 50-EMA with a trailing exit. In a bear regime (price below
 * a falling 200-SMA) BTC mean-reverts to the downside, so we switch to the defensive
 * band-bounce: buy the panic-bottom, sell back to the middle. This fixes the classic
 * mean-reversion weakness of sitting in cash during melt-ups.
 * When it buys and sells: bull mode enters on a pullback to a rising 50-EMA and exits
 * on a 3-ATR trailing stop; bear mode buys below the lower Bollinger(20,2) with RSI<30
 * and exits at the middle band / RSI>50 or a 6-ATR stop.
 * When it does NOT work: in a choppy range where the regime flips back and forth, the
 * switches whipsaw and fees accumulate; a sudden crash from bull to bear catches the
 * trend position before the trailing stop reacts. Not a low-trade strategy.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200Prev = ctx.sma(200, 2);
  if (sma200 == null || sma200Prev == null) return null;

  const bull = price > sma200 && sma200 > sma200Prev * 1.0001;
  const bear = price < sma200;

  if (bull) {
    // TREND MODE: ride pullbacks to a rising 50-EMA, trail with 3-ATR.
    const ema50 = ctx.ema(50, 1);
    const atr = ctx.atr(14, 1);
    if (ema50 == null || atr == null) return null;
    if (pos > 0) {
      if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
      return null;
    }
    // enter when price pulls back to (within 0.5 ATR of) the rising EMA and is above it
    if (price >= ema50 && price <= ema50 + atr * 0.5) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  if (bear) {
    // DEFENSIVE MODE: band-bounce mean reversion (validated family).
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    const atr = ctx.atr(14, 1);
    if (bb == null || rsi == null || atr == null) return null;
    if (pos > 0) {
      if (price >= bb.mid || rsi > 50) return { side: 'sell', qty: pos };
      if (price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
      return null;
    }
    const lastExit = ctx.state.lastExit || 0;
    if (ctx.i - lastExit < 5) return null;
    if (price < bb.lower && rsi < 30) {
      ctx.state.lastExit = ctx.i;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  // neutral zone (price near SMA, regime unclear): hold if in, else wait
  return null;
}
