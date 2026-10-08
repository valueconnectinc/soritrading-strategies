/*
 * @coinsori-strategy v1
 * name: ETH 1D Oversold-Bounce (Mean Reversion)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: in crypto, sharp sell-offs inside a bull market tend to
 * bounce back toward the mean. This bets on that bounce — the opposite of the
 * trend-following work done earlier in this project.
 * When it buys and sells: buys when the 14-day RSI is oversold (<30) AND price
 * is still above the 200-day average (bull regime only — avoids catching falling
 * knives in bear markets). Sells when RSI recovers above 55 (bounce done) or if
 * price falls 2x ATR below entry (bounce failed, cut the loss).
 * When it does NOT work: in a prolonged bear market it stays mostly in cash
 * (good) but the few trades it takes can still lose; in a slow grind-down where
 * RSI stays under 30 for weeks it can buy too early repeatedly.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (rsi == null || sma200 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    // exit: bounce completed (RSI back above 55) or stop hit (2x ATR below entry)
    const stopPx = ctx.entryPx - 2 * atr;
    if (rsi > 55 || price < stopPx) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // buy oversold bounce only in a bull regime
  if (rsi < 30 && price > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
