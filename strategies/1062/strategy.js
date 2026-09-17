/*
 * @coinsori-strategy v1
 * name: RSI-BB Lower Band 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H BTC. When price touches the lower Bollinger Band (20,2)
 * AND RSI(14) is below 35, the market is oversold relative to recent range — a
 * likely bounce. Target: middle BB band. Stop: 2×ATR below entry.
 * Loses in strong downtrends where "oversold stays oversold."
 */

function onUpdate(ctx) {
  const bb  = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  if (bb == null || rsi == null) return null;

  const price = ctx.price;
  const pos   = ctx.position;
  const atr   = ctx.atr(14);
  if (atr == null) return null;

  // === ENTRY: price at/below lower BB AND RSI oversold ===
  if (pos <= 0 && price <= bb.lower && rsi < 35) {
    const riskAmt = ctx.cash * 0.015;
    const stopDist = atr * 2.0;
    const qty = riskAmt / stopDist;
    return { side: 'buy', qty: qty };
  }

  // === EXIT: target = middle BB band ===
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    if (entryPx == null) return null;

    // Profit target: price reaches middle BB band
    if (price >= bb.middle) {
      return { side: 'sell', qty: pos };
    }

    // Stop: 2×ATR from entry
    if (price < entryPx - atr * 2) {
      return { side: 'sell', qty: pos };
    }

    // RSI overbought exit
    if (rsi > 65) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
