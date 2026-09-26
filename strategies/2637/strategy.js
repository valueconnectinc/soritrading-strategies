/*
 * @coinsori-strategy v1
 * name: Regime-Switching Trend + Mean-Reversion BTC 4H v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Two proven price behaviours on one asset, chosen by regime.
 * In a bull regime (price above a clearly rising 200-SMA) BTC tends to keep trending,
 * so we ride pullbacks to the 50-EMA with a chandelier trail. In a bear regime (price
 * below the 200-SMA) BTC mean-reverts to the downside, so we switch to the defensive
 * band-bounce: buy the panic-bottom, sell back to the middle. v2 makes the trend mode
 * MORE SELECTIVE (MACD gate + clearly-rising SMA) so it does not whipsaw in choppy
 * bears — the failure of v1.
 * When it buys and sells: bull mode enters on a pullback to a rising 50-EMA with MACD
 * above signal, exits on a chandelier trail (highest-high minus 3 ATR); bear mode buys
 * below the lower Bollinger(20,2) with RSI<30 and exits at the middle band / RSI>50 or
 * a 6-ATR stop, with a 5-bar cooldown.
 * When it does NOT work: in a choppy range where the regime flips repeatedly, switches
 * whipsaw and fees accumulate; a sudden crash from bull to bear catches the trend
 * position before the trail reacts. Not a low-trade strategy.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200Prev = ctx.sma(200, 2);
  const sma200Prev20 = ctx.sma(200, 21);
  if (sma200 == null || sma200Prev == null || sma200Prev20 == null) return null;

  // clearly-rising 200-SMA over 20 bars for bull regime (v2: stricter)
  const bull = price > sma200 && sma200 > sma200Prev20 * 1.01;
  const bear = price < sma200;

  if (bull) {
    const ema50 = ctx.ema(50, 1);
    const atr = ctx.atr(14, 1);
    const macd = ctx.macd(12, 26, 9, 1);
    if (ema50 == null || atr == null || macd == null || macd.signal == null) return null;
    if (pos > 0) {
      // chandelier trail from highest high since entry
      const hi = ctx.high(1);
      const peak = Math.max(ctx.state.peak || ctx.entryPx, hi);
      ctx.state.peak = peak;
      if (price <= peak - atr * 3) return { side: 'sell', qty: pos };
      return null;
    }
    // enter only on a pullback to the rising EMA, above it, with MACD momentum up
    if (price >= ema50 && price <= ema50 + atr * 0.5 && macd.macd > macd.signal) {
      ctx.state.peak = price;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  if (bear) {
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

  return null;
}
