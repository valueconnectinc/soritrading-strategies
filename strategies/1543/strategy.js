/*
 * @coinsori-strategy v1
 * name: RSI Oversold Mean Reversion
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI(14) drops below 30 with above-average volume, betting that
 * oversold conditions reverse. Exits when RSI reaches 55 or price hits a
 * 5% profit target. The goal is small consistent gains with far less
 * drawdown than buy-and-hold on DOGE.
 * When it buys and sells: buy on RSI oversold + volume surge; sell on RSI
 * overbought recovery or 5% profit cap.
 * When it does NOT work: fails in sustained one-way crashes (RSI stays low
 * and keeps grinding down) and in strong trending pumps (RSI recovers but
 * reverses again quickly).
 */

function onUpdate(ctx) {
    // Require 20 bars for volume average + 14 bars for RSI
    const rsi = ctx.rsi(14);
    const volAvg = ctx.avgVol(20);
    if (rsi == null || volAvg == null || ctx.vol == null) return null;

    const pos = ctx.position;

    // ── ENTRY ── RSI oversold + volume surge, no position held
    if (pos <= 0) {
        const rsi1 = ctx.rsi(14, 1);   // previous bar RSI
        if (rsi1 == null) return null;

        // RSI crosses below 30 on this bar
        const rsiCrossDown = rsi1 >= 30 && rsi < 30;
        // Volume at least 1.2x its 20-bar average
        const volConfirm = ctx.vol > volAvg * 1.2;

        if (rsiCrossDown && volConfirm) {
            // Use 80% of available cash
            return { side: 'buy', qty: (ctx.cash * 0.80) / ctx.price };
        }
    }

    // ── EXIT ── position held — take profit or RSI recovery
    if (pos > 0) {
        const rsi1 = ctx.rsi(14, 1);
        if (rsi1 == null) return null;

        const entryPx = ctx.entryPx;
        const pnlPct = (ctx.price - entryPx) / entryPx;

        // Exit 1: 5% profit target hit
        if (pnlPct >= 0.05) {
            return { side: 'sell', qty: pos };
        }

        // Exit 2: RSI crosses back above 55 (momentum exhausted)
        const rsiCrossUp = rsi1 <= 55 && rsi > 55;
        if (rsiCrossUp) {
            return { side: 'sell', qty: pos };
        }

        // Exit 3: stop-loss if RSI stays below 25 for 2 bars (no recovery)
        const rsi2 = ctx.rsi(14, 2);
        if (rsi != null && rsi2 != null && rsi < 25 && rsi2 < 25 && pnlPct < -0.03) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
