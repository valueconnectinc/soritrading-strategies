/*
 * @coinsori-strategy v1
 * name: ATR Trailing Stop Mean Reversion
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Tight RSI-oversold mean reversion with SMA trend filter and ATR trailing stop.
 * Buys when RSI drops below 30 in a confirmed uptrend (price > SMA50), using
 * ATR to set a trailing stop that locks in gains without capping winners.
 * Exits on ATR-based stop or when RSI reaches 65 (overbought).
 * Works in both bull and sideways markets; loses in sustained downtrends.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);
  const sma50 = ctx.sma(50);
  const price = ctx.price;

  // Warm-up guard: need at least 50 bars for SMA50
  if (rsi == null || atr == null || sma50 == null) return null;

  // ── Position state ─────────────────────────────────────────────────────────
  // Use ctx.data to persist trailing stop across bars
  let trailStop = ctx.data('trailStop');

  // ── Entry: RSI oversold + uptrend confirmed ───────────────────────────────
  if (ctx.position === 0) {
    // RSI < 30: deeply oversold — high probability bounce
    // Price > SMA50: broad market is healthy, not a crash
    if (rsi < 30 && price > sma50) {
      // Initial stop: 2 × ATR below entry — gives the trade room to work
      const stopPx = price - 2 * atr;
      ctx.data({ trailStop: stopPx });   // persist for next bars
      return {
        side: 'buy',
        qty: ctx.cash / price * 0.99,
        // Smart order waits for pullback fill, not aggressive market order
        type: 'limit',
        price: ctx.mid() * 0.998,  // slight discount to get a better fill
      };
    }
  }

  // ── Trailing stop management ──────────────────────────────────────────────
  if (ctx.position > 0 && trailStop != null) {
    // ATR trailing stop: move stop up when price rises, never move down
    // New stop = price − 2×ATR (keeps 2-ATR breathing room)
    const newStop = price - 2 * atr;
    if (newStop > trailStop) {
      ctx.data({ trailStop: newStop });
      trailStop = newStop;
    }

    // Stop-loss hit: price closes below trailing stop
    if (price < trailStop) {
      ctx.data({ trailStop: null });
      return { side: 'sell', qty: ctx.position };
    }

    // Take-profit: RSI overbought → likely mean reversion peak
    if (rsi > 65) {
      ctx.data({ trailStop: null });
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
