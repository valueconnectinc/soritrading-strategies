/*
 * @coinsori-strategy v1
 * name: RSI2 Short-Term Mean Reversion BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Short-term overreactions in liquid majors mean-revert
 * quickly. A fast RSI(2) reading below 10 or above 90 marks an over-extended
 * move that tends to snap back. This is a high-frequency short-horizon mean
 * reversion — a different trade rhythm than the slow panic-bottom band-bounce.
 * When it buys and sells: buys when RSI(2) drops below 10 (oversold snap-back)
 * and sells when it recovers above 50. Shorts when RSI(2) exceeds 90 and covers
 * below 50 (long+short, trend-neutral).
 * When it does NOT work: in a strong persistent trend RSI(2) stays pinned and
 * the snap-back keeps losing to momentum; whipsaws in tight chop.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const rsi2 = ctx.rsi(2, 1);
  if (rsi2 == null) return null;

  if (pos > 0) {
    if (rsi2 >= 50) return { side: 'sell', qty: pos };
    return null;
  }
  if (pos < 0) {
    if (rsi2 <= 50) return { side: 'buy', qty: -pos };
    return null;
  }
  if (rsi2 < 10) return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  if (rsi2 > 90) return { side: 'sell', qty: ctx.cash / ctx.price * 0.95 };
  return null;
}
