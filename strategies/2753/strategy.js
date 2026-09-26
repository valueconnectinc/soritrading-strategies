/*
 * @coinsori-strategy v1
 * name: Panic-Flush Double-Green Recovery BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Defensive panic-bottom family like the band-bounce
 * champion, but the entry is a PURE price-action confirmation instead of the
 * RSI<30 filter: price must first close at/below the lower Bollinger band
 * (panic flush), then the NEXT TWO bars must both close green (a confirmed
 * recovery, not a one-bar dead-cat bounce). Bet: two consecutive green closes
 * after a lower-band flush mark a real capitulation, filtering the false
 * one-bar bounces that a single green bar admits.
 * When it buys and sells: buys when the bar two back closed at/below the
 * lower Bollinger band AND the two most recent bars both closed green AND
 * price holds above the 200-SMA; sells back at the middle band or RSI>50, or
 * on a 6x-ATR stop. 5-bar cooldown.
 * When it does NOT work: in a violent crash below the 200-SMA it still buys
 * falling knives after a two-bar bounce; it lags strong melt-ups (sits in
 * cash during parabolic bulls). Two green bars can still be a bear-market
 * relief rally that reverses.
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

  // Closes: closes[i-1] = most recent, [i-2] = previous, [i-3] = panic bar
  const c1 = ctx.closes[ctx.i - 1];
  const c2 = ctx.closes[ctx.i - 2];
  const c3 = ctx.closes[ctx.i - 3];
  const c4 = ctx.closes[ctx.i - 4];
  if (c1 == null || c2 == null || c3 == null || c4 == null) return null;

  // Panic flush: the bar two back closed at/below the lower band
  const panicFlush = c3 <= bb.lower;
  // Confirmed recovery: the two most recent bars both closed green
  const doubleGreen = c2 > c3 && c1 > c2;

  if (panicFlush && doubleGreen) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
