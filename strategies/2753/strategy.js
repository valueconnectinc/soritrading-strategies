/*
 * @coinsori-strategy v1
 * name: Panic-Flush Recovery Candle BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Defensive panic-bottom family like the band-bounce
 * champion, but the entry trigger is a PRICE-ACTION confirmation instead of
 * the RSI<30 oscillator filter: price must first CLOSE at/below the lower
 * Bollinger band (a genuine panic flush), then the very next bar must CLOSE
 * green (buyers stepped in = recovery started). Bet: the green recovery bar
 * right after a lower-band flush marks the capitulation point with fewer
 * false entries than a raw oversold reading.
 * When it buys and sells: buys when the previous bar closed at/below the
 * lower Bollinger band AND the just-closed bar closed green AND price holds
 * above the 200-SMA; sells back at the middle band or RSI>50, or on a 6x-ATR
 * stop. 5-bar cooldown.
 * When it does NOT work: in a violent crash below the 200-SMA it still buys
 * falling knives after a green bounce bar; it lags strong melt-ups (sits in
 * cash during parabolic bulls). A single green bar can be a dead-cat bounce
 * in a strong downtrend that keeps selling off.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  if (sma200 == null || bb == null) return null;

  // Exit logic (same proven framework as the champion)
  if (pos > 0) {
    const rsi = ctx.rsi(14, 1);
    if (rsi != null && (price >= bb.mid || rsi > 50)) {
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

  // Price-action entry: previous bar closed at/below the lower band (panic
  // flush) AND the just-closed bar closed green (recovery started).
  const prevClose = ctx.closes[ctx.i - 2];
  const curClose = ctx.closes[ctx.i - 1];
  const prevPrevClose = ctx.closes[ctx.i - 3];
  if (prevClose == null || curClose == null || prevPrevClose == null) return null;

  const panicFlush = prevClose <= bb.lower;
  const recoveryGreen = curClose > prevClose;

  if (panicFlush && recoveryGreen) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
