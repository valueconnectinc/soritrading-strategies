/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Buys when RSI drops below 30 (oversold) AND price touches the lower Bollinger Band —
 * a classic mean-reversion bet: the price has fallen too far and should bounce.
 * Sells when RSI climbs above 70 (overbought) OR price reaches the middle band.
 * When it does NOT work: trending markets where price stays at the BB band for extended
 * periods — the strategy accumulates small losses waiting for a bounce that never comes.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2);
  const sma50 = ctx.sma(50);

  // Warm-up guard: need enough bars for all indicators
  if (rsi == null || bb == null || bb.mid == null || sma50 == null) return null;

  const price = ctx.price;
  const { lower, mid } = bb;

  // Only enter when price is above its 50-bar moving average (trend confirmation)
  // Prevents buying into downtrends — a key filter from prior experiment results
  const inUptrend = price > sma50;

  // === ENTRY CONDITIONS ===
  if (ctx.position === 0) {
    // Buy: RSI oversold AND price at or below lower BB
    // RSI<35 is slightly looser than 30 to catch more setups while keeping quality
    if (rsi < 35 && price <= lower && inUptrend) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT CONDITIONS ===
  if (ctx.position > 0) {
    // Sell: RSI overbought OR price reached middle BB
    if (rsi > 65 || price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
