/*
 * @coinsori-strategy v1
 * name: RSI Momentum 4H v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum pullback strategy on 4H BTC. When RSI drops below 35 in an uptrend
 * (price above EMA-50), the market is deeply oversold within the trend — a buy signal.
 * Exits: RSI above 70, or 3×ATR profit target, or trailing stop below peak minus 2×ATR.
 * Loses in choppy, range-bound markets where RSI oscillates without trend.
 */

function onUpdate(ctx) {
  const ema50 = ctx.ema(50);
  if (ema50 == null) return null;

  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const atr = ctx.atr(14);
  if (atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // === ENTRY: deep pullback in uptrend ===
  if (pos <= 0 && price > ema50 && rsi < 35) {
    const riskAmt = ctx.cash * 0.015;
    const stopDist = atr * 1.5;
    const qty = riskAmt / stopDist;
    return { side: 'buy', qty: qty };
  }

  // === TRAILING STOP: track peak price ===
  if (pos > 0) {
    // Initialize or update peak
    const peak = ctx.state.peak || ctx.entryPx || price;
    if (price > peak) ctx.state.peak = price;

    const entryPx = ctx.entryPx;
    if (entryPx == null) return null;

    const currPeak = ctx.state.peak || price;

    // Stop-loss: price fell 2.5×ATR from peak
    if (price < currPeak - atr * 2.5) {
      return { side: 'sell', qty: pos };
    }

    // Profit target: price gained 3×ATR from entry
    if (price >= entryPx + atr * 3) {
      return { side: 'sell', qty: pos };
    }

    // RSI overbought exit
    if (rsi > 70) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
