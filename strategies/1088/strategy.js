/*
 * @coinsori-strategy v1
 * name: RSI-30 Oversold Mean Reversion ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH frequently snaps back from RSI oversold zones.
 * A simple RSI < 30 entry with a 50-exit is a clean, low-parameter mean
 * reversion play — less prone to curve-fitting than multi-indicator combos.
 * When it buys and sells: Buys when RSI-14 drops below 30 (oversold).
 * Sells when RSI crosses above 50 (mean reversion complete) OR on a 5% hard stop.
 * When it does NOT work: In strong one-way drops (sustained RSI < 30 for weeks),
 * the strategy repeatedly buys the dip and gets stopped out — each loss erodes
 * capital before the real bounce comes.
 */

function onUpdate(ctx) {
  const rsi1 = ctx.rsi(14, 1);
  const rsi2 = ctx.rsi(14, 2);
  const atr  = ctx.atr(14, 1);

  if (rsi1 == null || rsi2 == null || atr == null) return null;

  const inPos = ctx.position > 0;

  // ── ENTRY: RSI crosses below 30 (first touch of oversold) ──
  const rsiCrossDown = rsi2 >= 30 && rsi1 < 30;

  if (!inPos && rsiCrossDown) {
    // Stop: 5% hard stop below entry
    const stopPx = ctx.price * 0.95;
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99
    };
  }

  // ── EXIT 1: RSI crosses above 50 (mean reversion complete) ──
  const rsiCrossUp = rsi2 <= 50 && rsi1 > 50;

  if (inPos && rsiCrossUp) {
    return { side: 'sell', qty: ctx.position };
  }

  // ── EXIT 2: 5% hard stop ──
  if (inPos && ctx.price <= ctx.entryPx * 0.95) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
