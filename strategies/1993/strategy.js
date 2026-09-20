/*
 * @coinsori-strategy v1
 * name: Volume Profile Breakout v2
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Price breaking above a 20-bar high on above-average volume
 * signals institutional accumulation — the market is being absorbed by buyers.
 * When it buys and sells: Buy on close when price closes above the 20-bar high
 * (calculated manually from closes array) and volume exceeds its 20-bar average.
 * Exit via ATR trailing stop or when RSI drops below 40.
 * When it does NOT work: Fails in thin liquidity and bear markets where breakouts are traps.
 */
function onUpdate(ctx) {
    const atr = ctx.atr(14);
    if (atr == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;

    // Volume must exceed 20-bar average (confirms the move is real)
    // Use previous bar volume (ctx.volumes[1]) — current bar may still be forming
    const prevVol = ctx.volumes ? ctx.volumes[1] : ctx.vol;
    if (prevVol == null || prevVol <= avgVol) return null;

    // Manual 20-bar high from closes array (more reliable than ctx.high)
    let hi20 = -Infinity;
    for (let i = 1; i <= 20; i++) {
        const c = ctx.closes[i];
        if (c == null) { hi20 = null; break; }
        if (c > hi20) hi20 = c;
    }
    if (hi20 == null || hi20 === -Infinity) return null;

    // Entry: price closes above the 20-bar high (breakout confirmed on close)
    const isBreakout = ctx.price > hi20;
    if (!isBreakout) return null;

    // RSI must be in a healthy range (40-65 — avoid overbought and weak signals)
    const rsi = ctx.rsi(14);
    if (rsi == null || rsi > 65 || rsi < 40) return null;

    // No position — enter long on breakout
    if (ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // Position open — ATR trailing stop management
    const trail = atr * 2.5;

    // Exit 1: ATR trailing stop hit (price fell 2.5x ATR from entry)
    if (ctx.entryPx < ctx.price - trail) {
        return { side: 'sell', qty: ctx.position };
    }

    // Exit 2: RSI momentum fade (drops below 40)
    const prevRsi = ctx.rsi(14, 1);
    if (prevRsi != null && rsi < 40 && prevRsi >= 40) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
