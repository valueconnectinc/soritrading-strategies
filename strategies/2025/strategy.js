/*
 * @coinsori-strategy v1
 * name: RSI Momentum Volume v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Tightens the RSI signal band and volume filter to reduce
 * whipsaws that plagued v1 (76 trades, -8.9% avg). Wider RSI 40-70 band avoids
 * chasing overbought; 1.2x volume threshold ensures only high-conviction breakouts.
 * 15% TP lets winners run in SOL's explosive moves.
 * When it buys and sells: Buys when RSI crosses above 50 (not 55 — wider band)
 * with price above EMA21 and volume > 1.2x its 20-bar average. Sells on EMA9<EMA21
 * flip, RSI>70, or 15% take-profit.
 * When it does NOT work: In slow grinding trends where RSI never drops back to 50
 * (missed entries), or in sharp reversals where the 15% TP never hits.
 */
function onUpdate(ctx) {
    const price    = ctx.price;
    const position = ctx.position;

    // Indicators
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const avgVol = ctx.avgVol(20);
    const vol    = ctx.vol;

    // Warm-up
    if (ema9 == null || ema21 == null || rsi == null || atr == null || avgVol == null || vol == null) return null;

    // Previous bar for crossover detection
    const prevRsi   = ctx.rsi(14, 1);
    const prevEma9  = ctx.ema(9,  1);
    const prevEma21 = ctx.ema(21, 1);
    if (prevRsi == null || prevEma9 == null || prevEma21 == null) return null;

    // Volume confirmation: today's volume must be 1.2x above its 20-bar average (high conviction)
    const volConfirm = vol >= avgVol * 1.2;

    // ---- ENTRY: Long ----
    // RSI crosses above 50 (wider band = fewer signals than v1's 55 threshold)
    const rsiCrossUp = prevRsi <= 50 && rsi > 50;
    // Price above EMA21 (trend is up)
    const trendUp = price > ema21;
    // Volume confirms the move (1.2x threshold — stricter than v1)
    const volOk = volConfirm;

    if (rsiCrossUp && trendUp && volOk && position === 0) {
        // Stop: 2.5x ATR below entry (tighter than v1's 2x ATR, relative to SOL's vol)
        const stopPx = price - 2.5 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.98,
            type: 'limit',
            price: price,
            stopPx: stopPx
        };
    }

    // ---- EXIT LONG ----
    if (position > 0) {
        const entryPx = ctx.entryPx;
        const pnlPct  = (price - entryPx) / entryPx;

        // Take profit at 15% (wider than v1's 10% — let winners run)
        if (pnlPct >= 0.15) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Stop-loss at 2.5x ATR
        const atrStop = entryPx - 2.5 * atr;
        if (price <= atrStop) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Exit on overbought (RSI > 70 — trend may be exhausting)
        if (rsi > 70) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Exit on EMA crossover flip (trend ended)
        if (ema9 < ema21) {
            return { side: 'sell', qty: position, type: 'market' };
        }
    }

    return null;
}
