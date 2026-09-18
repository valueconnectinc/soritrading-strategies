/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion with ATR Stop
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines Bollinger Band mean reversion with ATR-based trailing stop.
 * Buys when price touches the lower BB band in an uptrend (SMA50 rising),
 * using RSI<38 to confirm oversold. ATR trailing stop locks gains without
 * capping winners. Exits on stop or when RSI reaches 65 (overbought).
 * Loses in sustained downtrends where SMA50 is falling.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi    = ctx.rsi(14);
  const atr    = ctx.atr(14);
  const bb     = ctx.bb(20, 2);
  const sma50  = ctx.sma(50);
  const sma50_1 = ctx.sma(50, 1); // previous bar's SMA50
  const price  = ctx.price;

  // Warm-up: need 50 bars for SMA50
  if (rsi == null || atr == null || bb == null || sma50 == null || sma50_1 == null) return null;

  const lowerBand = bb.lower;
  const midBand   = bb.mid;

  // ── Uptrend: SMA50 is rising (not flat or falling) ─────────────────────────
  const inUptrend = sma50 > sma50_1;

  // ── Persist trailing stop across bars via ctx.data ──────────────────────────
  let trailStop = ctx.data('trailStop');

  // ── ENTRY ──────────────────────────────────────────────────────────────────
  if (ctx.position === 0) {
    // Buy when: price at/near BB lower band, RSI oversold, uptrend confirmed
    const atLowerBand = price <= lowerBand * 1.005; // 0.5% buffer for touching
    if (rsi < 38 && atLowerBand && inUptrend) {
      const stopPx = price - 2.5 * atr; // initial stop 2.5× ATR below entry
      ctx.data({ trailStop: stopPx });
      return { side: 'buy', qty: ctx.cash / price * 0.99 }; // market order
    }
  }

  // ── TRAILING STOP MANAGEMENT ───────────────────────────────────────────────
  if (ctx.position > 0) {
    // Move stop up when price rises; never lower it
    const newStop = price - 2.5 * atr;
    if (trailStop == null || newStop > trailStop) {
      ctx.data({ trailStop: newStop });
      trailStop = newStop;
    }

    // Stop-loss hit
    if (price < trailStop) {
      ctx.data({ trailStop: null });
      return { side: 'sell', qty: ctx.position };
    }

    // Take-profit: RSI overbought
    if (rsi > 65) {
      ctx.data({ trailStop: null });
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
