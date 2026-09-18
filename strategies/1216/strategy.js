/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Buys when RSI drops below 35 (oversold) AND price touches the lower Bollinger Band —
 * a classic mean-reversion bet: the price has fallen too far and should bounce.
 * Sells when RSI climbs above 60 OR price reaches the middle band.
 * When it does NOT work: trending markets where price stays at the BB band for extended
 * periods — the strategy accumulates small losses waiting for a bounce that never comes.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2);

  // Warm-up guard
  if (rsi == null || bb == null || bb.mid == null) return null;

  const price = ctx.price;
  const { lower, mid } = bb;

  // === ENTRY: oversold + at lower BB ===
  if (ctx.position === 0) {
    // Buy: RSI oversold AND price at or below lower BB
    // Removed SMA50 filter to allow more trades — lower BB touch is strong enough signal
    if (rsi < 35 && price <= lower) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: overbought or at middle BB ===
  if (ctx.position > 0) {
    // Sell: RSI overbought OR price reached middle BB
    if (rsi > 60 || price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
