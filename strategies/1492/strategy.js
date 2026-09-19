/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion 40/50 — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Minimal RSI mean-reversion: buy when RSI drops below 40 (oversold),
 * sell when it recovers above 50 (mean reversion complete). This is a
 * stripped-down test to confirm the backtest engine generates signals,
 * before adding complexity like EMA or Bollinger Band filters.
 * Works in pullback markets. Fails in sustained trends where RSI stays
 * extended for long periods.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const position = ctx.position;

    if (!position && rsi < 40) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    if (position && rsi > 50) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
