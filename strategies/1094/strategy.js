/*
 * @coinsori-strategy v1
 * name: MACD Trend ATR Stop Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following strategy using MACD crossovers with ATR-based stops.
 * Buys when MACD crosses above signal line in an uptrend, sells when it reverses.
 * When it buys and sells: buys when MACD crosses above signal line and price is above SMA200
 * (confirming uptrend). Sells when MACD crosses below signal line or ATR trailing stop triggers.
 * When it does NOT work: fails in choppy markets with frequent MACD whipsaws, and during
 * prolonged sideways action where SMA200 stays flat — generates small losses from false breaks.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────
  const macd1 = ctx.macd(12, 26, 9, 1);
  const macd2 = ctx.macd(12, 26, 9, 2);
  if (macd1 == null || macd2 == null) return null;

  const sma200 = ctx.sma(200);
  if (sma200 == null) return null;

  const atr = ctx.atr(14);
  if (atr == null) return null;

  // ── Position sizing ─────────────────────────────────────
  // Risk 2% of cash per trade: qty = (cash * 0.02) / ATR
  const riskQty = (ctx.cash * 0.02) / atr;

  // ── Entry: MACD bullish crossover + price above SMA200 ──
  // MACD crossed above signal line (macd > signal AND prior macd <= prior signal)
  const macdBullish = macd1.macd > macd1.signal
    && macd2.macd <= macd2.signal;
  const aboveSma = ctx.price > sma200;

  if (macdBullish && aboveSma && ctx.position === 0) {
    return {
      side: 'buy',
      qty: riskQty,
      type: 'limit',
      price: ctx.price,
      postOnly: false
    };
  }

  // ── Exit: MACD bearish crossover ───────────────────────
  const macdBearish = macd1.macd < macd1.signal
    && macd2.macd >= macd2.signal;

  if (macdBearish && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // ── ATR trailing stop (safety net if MACD stays flat) ──
  // If in position, check if price dropped more than 3× ATR from entry
  if (ctx.position > 0 && ctx.entryPx != null) {
    const atrStop = ctx.entryPx - 3 * atr;
    if (ctx.price < atrStop) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
