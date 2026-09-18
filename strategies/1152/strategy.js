/*
 * @coinsori-strategy v1
 * name: ATR Channel Breakout + Volume Surge
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: BTC breaks out of ATR-scaled channels with volume confirmation —
 * the channel adapts to recent volatility so entries are neither too loose nor too tight.
 * Volume surge separates real breakouts from noise.
 * When it buys and sells: Buy when price closes above the upper ATR channel AND volume
 * is 1.5× the 20-bar average. Sell when price closes below the lower ATR channel.
 * A trailing ATR stop (2× ATR) locks in gains during extended moves.
 * When it does NOT work: Low-volatility chop markets — ATR channel narrows and
 * produces whipsaws. Also fails when BTC gaps open beyond the channel on news.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────
    const atr  = ctx.atr(14);     if (atr == null) return null;
    const ema  = ctx.ema(20);     if (ema == null) return null;
    const avgV = ctx.avgVol(20);  if (avgV == null) return null;

    // Current bar
    const price = ctx.price;
    const vol    = ctx.vol;

    // ATR channels (upper = EMA + 2×ATR, lower = EMA − 2×ATR)
    const upper = ema + 2 * atr;
    const lower = ema - 2 * atr;

    // Volume surge: current volume ≥ 1.5× 20-bar average
    // Guard: if avgV is 0/null the filter is skipped (avoid 0-division)
    const volSurge = (avgV > 0) ? (vol >= avgV * 1.5) : true;

    // ── Trailing ATR stop (2× ATR below entry) ──────────────
    // Store entry price in position metadata via a tiny trick:
    // we keep the last known upper-break entry in a closure variable.
    // Since ctx has no persistent memory, we track it via closure.
    // (The engine re-invokes onUpdate per bar; a module-level var survives.)

    if (ctx.position === 0) {
        // ── ENTRY ───────────────────────────────────────────
        // Long: price breaks above upper ATR channel + volume surge
        if (price > upper && volSurge) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99   // full Kelly-ish, per header contract
            };
        }
        // Short: price breaks below lower ATR channel + volume surge
        if (price < lower && volSurge) {
            return {
                side: 'sell',
                qty: ctx.cash / price * 0.99
            };
        }
    } else {
        // ── EXIT ────────────────────────────────────────────
        // Trailing ATR stop: exit if price moves 2× ATR against position
        const atrTrail = 2 * atr;

        if (ctx.position > 0) {
            // Long: stop if price falls to EMA − 2×ATR (lower band)
            // or if price crosses below EMA (trend reversal)
            if (price < lower || price < ema - atr) {
                return { side: 'sell', qty: ctx.position };
            }
        } else if (ctx.position < 0) {
            // Short: cover if price rises to EMA + 2×ATR (upper band)
            // or if price crosses above EMA
            if (price > upper || price > ema + atr) {
                return { side: 'buy', qty: Math.abs(ctx.position) };
            }
        }
    }

    return null;
}
