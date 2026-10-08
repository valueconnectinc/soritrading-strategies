/*
 * @coinsori-strategy v1
 * name: ETH 1D Oversold-Bounce Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: in crypto, sharp sell-offs inside a bull market tend to
 * bounce back toward the mean. This bets on that bounce — the opposite of the
 * trend-following work done earlier in this project.
 * When it buys and sells: buys when the 14-day RSI is oversold (<30) AND the
 * market is in a CONFIRMED uptrend (50-day average above the 200-day average —
 * a stronger bull filter than price alone, so it avoids catching dips that keep
 * falling). Sells when RSI recovers above 55 (bounce done) or if price falls
 * 2.5x ATR below entry (bounce failed, cut the loss).
 * When it does NOT work: in a prolonged bear market it stays in cash (good) but
 * misses the eventual recovery; in a slow grind-down where RSI stays under 30
 * for weeks it can buy too early repeatedly.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  if (rsi == null || sma50 == null || sma200 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    // exit: bounce completed (RSI back above 55) or stop hit (2.5x ATR below entry)
    const stopPx = ctx.entryPx - 2.5 * atr;
    if (rsi > 55 || price < stopPx) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // buy oversold bounce only in a confirmed uptrend (50d avg above 200d avg)
  if (rsi < 30 && sma50 > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
