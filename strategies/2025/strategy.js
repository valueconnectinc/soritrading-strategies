/*
 * @coinsori-strategy v1
 * name: RSI Momentum Volume
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Combines RSI momentum (confirms the direction), volume
 * (confirms conviction), and EMA21 trend filter to catch medium-term swings
 * on a volatile asset like SOL. The RSI 40-65 band captures early-momentum
 * entries before overbought exhaustion.
 * When it buys and sells: Buys when RSI crosses above 55 with price above EMA21
 * and volume above average — catches the start of a push. Sells on RSI>72
 * (overbought) or EMA21 trend flip.
 * When it does NOT work: In slow grinding uptrends where RSI stays elevated
 * without crossing 55 (missed entry), or in choppy markets with false RSI
 * crosses and volume spikes (whipsaw losses).
 */
function onUpdate(ctx) {
    const price    = ctx.price;
    const position = ctx.position;

    // Indicators
    const ema21  = ctx.ema(21);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const avgVol = ctx.avgVol(20);
    const vol    = ctx.vol;

    // Warm-up
    if (ema21 == null || rsi == null || atr == null || avgVol == null || vol == null) return null;

    // Previous bar for crossover detection
    const prevRsi  = ctx.rsi(14, 1);
    const prevEma9 = ctx.ema(9, 1);
    const prevEma21 = ctx.ema(21, 1);
    if (prevRsi == null || prevEma9 == null || prevEma21 == null) return null;

    // EMA9 for crossover detection
    const ema9 = ctx.ema(9);
    if (ema9 == null) return null;

    // Volume confirmation: today's volume must be above its 20-bar average
    const volConfirm = vol >= avgVol;

    // ---- ENTRY: Long ----
    // RSI crosses above 55 (momentum building)
    const rsiCrossUp = prevRsi <= 55 && rsi > 55;
    // Price above EMA21 (trend is up)
    const trendUp = price > ema21;
    // Volume confirms the move
    const volOk = volConfirm;

    if (rsiCrossUp && trendUp && volOk && position === 0) {
        // Stop: 3% below entry or 2x ATR, whichever is tighter
        const pctStop = price * 0.97;
        const atrStop = price - 2.0 * atr;
        const stopPx  = Math.max(pctStop, atrStop);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.98,
            type: 'limit',
            price: price,
            stopPx: stopPx
        };
    }

    // ---- ENTRY: Short ----
    const rsiCrossDn = prevRsi >= 45 && rsi < 45;
    const trendDown  = price < ema21;

    if (rsiCrossDn && trendDown && volOk && position === 0) {
        const pctStop = price * 1.03;
        const atrStop = price + 2.0 * atr;
        const stopPx  = Math.min(pctStop, atrStop);
        return {
            side: 'sell',
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

        // Take profit at 10%
        if (pnlPct >= 0.10) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Stop-loss
        const pctStop = entryPx * 0.97;
        const atrStop = entryPx - 2.0 * atr;
        if (price <= Math.max(pctStop, atrStop)) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Exit on overbought
        if (rsi > 72) {
            return { side: 'sell', qty: position, type: 'market' };
        }
        // Exit on EMA flip
        if (ema9 < ema21) {
            return { side: 'sell', qty: position, type: 'market' };
        }
    }

    // ---- EXIT SHORT ----
    if (position < 0) {
        const entryPx = ctx.entryPx;
        const pnlPct   = (entryPx - price) / entryPx;

        // Take profit at 10%
        if (pnlPct >= 0.10) {
            return { side: 'buy', qty: Math.abs(position), type: 'market' };
        }
        // Stop-loss
        const shortStopPx = entryPx * 1.03;
        if (price >= shortStopPx) {
            return { side: 'buy', qty: Math.abs(position), type: 'market' };
        }
        // Exit on EMA flip
        if (ema9 > ema21) {
            return { side: 'buy', qty: Math.abs(position), type: 'market' };
        }
    }

    return null;
}
