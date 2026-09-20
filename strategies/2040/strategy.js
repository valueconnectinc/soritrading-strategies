/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Classic mean-reversion on RSI. Buy when RSI drops into oversold territory,
 * sell when it recovers into overbought — the idea is that RSI extremes
 * signal temporary exhaustion that price tends to reverse from.
 * When it buys and sells: enters on RSI < 30, exits on RSI > 70.
 * When it does NOT work: fails in strong trending markets where RSI stays
 * extended for long periods — the strategy catches falling knives.
 */

function onUpdate(ctx) {
    // Need at least 14 bars for RSI(14)
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // RSI at least 2 bars ago to avoid repainting on the current forming bar
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    const hasPosition = ctx.position > 0;

    // BUY: RSI crossed below 30 (was above, now below or at oversold)
    // Using ago=1 vs ago=2 to check the previous bar's crossover
    // rsi1 = bar 1 ago (previous closed bar), rsi2 = bar 2 ago
    if (!hasPosition && rsi2 >= 30 && rsi1 < 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: RSI crossed above 70 (was below, now in overbought)
    if (hasPosition && rsi2 <= 70 && rsi1 > 70) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
