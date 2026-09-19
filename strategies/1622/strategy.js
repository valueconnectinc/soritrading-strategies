/*
 * @coinsori-strategy v1
 * name: BB RSI EMA200 Mean Reversion v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H SOLUSDT. Buys when price hits the lower Bollinger Band
 * in a confirmed uptrend (EMA200 rising) with RSI oversold and rising volume.
 * Sells when price reaches the middle band, RSI reaches overbought, or 8 bars pass.
 * Works best in range-bound and choppy markets; loses when SOL enters a strong
 * sustained downtrend without bounces.
 */
function onUpdate(ctx) {
    // Indicators
    const ema200_1 = ctx.ema(200, 1);   // EMA200 1 bar ago (closed bar)
    const ema200_2 = ctx.ema(200, 2);   // EMA200 2 bars ago — rising = uptrend
    const rsi = ctx.rsi(14, 0);         // Current RSI
    const rsi_1 = ctx.rsi(14, 1);       // RSI 1 bar ago (for confirmation)
    const bb = ctx.bb(20, 2, 0);        // Current BB
    const bb_1 = ctx.bb(20, 2, 1);      // BB 1 bar ago
    const avgVol = ctx.avgVol(20);      // 20-bar avg volume
    const atr = ctx.atr(14, 0);         // ATR for trailing stop

    // Guard — wait for warm-up
    if (ema200_1 == null || ema200_2 == null || rsi == null || rsi_1 == null) return null;
    if (bb == null || bb_1 == null || avgVol == null || avgVol === 0) return null;

    // Trend filter: EMA200 must be rising (uptrend confirmed)
    const trendUp = ema200_1 > ema200_2;
    if (!trendUp) {
        // In downtrend: close long if open, no new entries
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // Volume confirmation: today's volume must be above 20-bar average
    const volConfirm = ctx.vol > avgVol;
    if (!volConfirm) return null;

    // BUY signal: price closed below lower BB 1 bar ago (formally confirmed)
    const lower1 = bb_1.lower;
    const price1 = ctx.closes[1]; // Close of bar 1 ago
    if (price1 == null) return null;

    const buySignal = price1 <= lower1;
    // RSI must be oversold and confirming: current RSI below 35, and RSI was rising (not just flat)
    const rsiOversold = rsi < 35 && rsi > rsi_1;

    // ENTRY
    if (ctx.position === 0 && buySignal && rsiOversold) {
        // Market buy with 99% of available cash
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // EXIT logic (only when in position)
    if (ctx.position > 0) {
        const mid = bb.mid;
        const upper = bb.upper;
        const entry = ctx.entryPx || ctx.price;
        const price = ctx.price;

        // Exit 1: Price reached middle BB
        if (price >= mid) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 2: RSI overbought (> 65)
        if (rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 3: Trailing stop — 1.5x ATR below entry
        const trailLevel = entry - 1.5 * atr;
        if (price < trailLevel) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 4: Max hold 8 bars — count bars since entry
        const barsHeld = ctx.candle - (ctx.symState?.entryBar || ctx.candle);
        if (barsHeld >= 8) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
