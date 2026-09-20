/*
 * @coinsori-strategy v1
 * name: Volume-Breakout EMA20 + ATR Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL's biggest moves are preceded by volume surges — volume
 * confirms that a breakout is real, not a spike-and-reversal. Previous strategies
 * (EMA crossover, ATR regime, MACD) all failed on SOL because they either whipsaw
 * in chop or get stopped out before trends complete. This uses a simple EMA20
 * breakout with volume confirmation and a 2.5× ATR stop — no regime filter so it
 * trades in both directions.
 * When it buys and sells: Buy when price crosses above EMA20 (closed bar) with
 * volume 1.5× above 20-bar average and RSI not overbought. Exit on EMA20 reversal
 * (closed bar closes below EMA20) or 2.5× ATR stop.
 * When it does NOT work: In low-volume trending markets or choppy periods where
 * volume spikes are false signals — the strategy can enter right before a reversal.
 */
function onUpdate(ctx) {
    const ema20   = ctx.ema(20);
    const rsi     = ctx.rsi(14);
    const atr     = ctx.atr(14);
    const avgVol  = ctx.avgVol(20);
    const price   = ctx.price;
    const vol     = ctx.vol;

    if (ema20 == null || rsi == null || atr == null || avgVol == null) return null;

    // Previous bar data (ago=1 = closed bar, stable for crossover detection)
    const ema20_1  = ctx.ema(20, 1);
    const rsi_1    = ctx.rsi(14, 1);
    const prevClose = (ctx.closes != null && ctx.closes.length > 1)
        ? ctx.closes[ctx.closes.length - 2] : null;

    if (ema20_1 == null || prevClose == null) return null;

    // Volume confirmation: current forming bar > 1.5× 20-bar average
    const volConfirm = avgVol > 0 && vol > avgVol * 1.5;

    const pos = ctx.position;

    // ══ ENTRY ══════════════════════════════════════════════════════════════════
    if (pos === 0) {
        // EMA20 breakout: previous bar was at/below EMA20, now above
        const breakout = prevClose <= ema20_1 && price > ema20;

        // Entry: breakout + volume surge + RSI not overbought
        if (breakout && volConfirm && rsi < 72) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }

        // Pullback entry: already above EMA, RSI dips to 40-50 then recovers
        const aboveEma = price > ema20;
        if (aboveEma && rsi_1 < 50 && rsi >= 50 && rsi < 72 && volConfirm) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // ══ EXIT ═══════════════════════════════════════════════════════════════════
    if (pos > 0) {
        // Exit 1: EMA20 reversal on closed bar (was above, now below)
        if (prevClose > ema20_1 && price < ema20) {
            return { side: 'sell', qty: pos };
        }

        // Exit 2: RSI overbought reversal
        if (rsi_1 < 68 && rsi >= 68) {
            return { side: 'sell', qty: pos };
        }

        // Exit 3: ATR trailing stop — 2.5× ATR below highest price since entry
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const highSoFar = Math.max(entryPx, prevClose);
            const stopPx = highSoFar - 2.5 * atr;
            if (price < stopPx) {
                return { side: 'sell', qty: pos };
            }
        }
    }

    return null;
}
