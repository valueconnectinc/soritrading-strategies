/*
 * @coinsori-strategy v1
 * name: Plain Band-Bounce BTC 4H (control)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Control recipe: the exact validated band-bounce mean-reversion on BTC 4H,
 * with NO open-interest filter. Used to isolate whether the OI-crowding filter
 * adds or removes value on BTC.
 * When it buys and sells: buys when price closes below lower Bollinger(20,2)
 * with RSI<30 above the 200-SMA; exits at middle band / RSI>50 or 6-ATR stop;
 * 5-bar re-entry cooldown.
 * When it does NOT work: lags melt-ups; never buys below the 200-SMA; a panic
 * that keeps falling still loses.
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
