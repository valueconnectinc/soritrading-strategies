/*
 * @coinsori-strategy v1
 * name: RSI Momentum 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum pullback strategy on 4H BTC. When RSI drops below 40 in an uptrend
 * (price above EMA-50), the market is oversold within the trend — a buy signal.
 * When RSI climbs above 65 or price drops below EMA-50, take profit or exit.
 * Works best in trending markets; loses in choppy, directionless conditions.
 */

function onUpdate(ctx) {
  // Trend filter: price must be above EMA-50 to consider longs
  const ema50 = ctx.ema(50);
  if (ema50 == null) return null;

  // RSI momentum — lower threshold (40) catches deeper pullbacks safely
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // ATR for stop-loss sizing
  const atr = ctx.atr(14);
  if (atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // === ENTRY: price in uptrend AND RSI deeply oversold ===
  // RSI below 40 = oversold within trend; above EMA confirms the trend
  if (pos <= 0 && price > ema50 && rsi < 40) {
    // Risk 1.5% of cash per trade; stop = entry - 1.5 * ATR
    const riskAmt = ctx.cash * 0.015;
    const stopDist = atr * 1.5;
    const qty = riskAmt / stopDist;
    return {
      side: 'buy',
      qty: qty,
      type: 'limit',
      price: price,            // market buy at current price
    };
  }

  // === EXIT: RSI overbought OR trend reversal ===
  if (pos > 0) {
    // Take profit: RSI above 65 (momentum exhausted)
    if (rsi > 65) {
      return { side: 'sell', qty: pos };
    }
    // Stop loss: price dropped below EMA-50 (trend broken)
    if (price < ema50) {
      return { side: 'sell', qty: pos };
    }
    // Trailing stop: price fell 2.5 * ATR from peak (hard stop)
    const entryPx = ctx.entryPx;
    if (entryPx != null && price < entryPx - atr * 2.5) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
