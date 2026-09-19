/*
 * @coinsori-strategy v1
 * name: Trend-Following ATR Trailing Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-follows BTC using EMA golden/death cross for direction,
 * then rides the trend with an ATR-based trailing stop for exit.
 * Buys when fast EMA crosses above slow EMA (confirmed uptrend),
 * sells when fast EMA crosses below slow EMA OR trailing stop is hit.
 * Works best in trending markets with clear directional moves.
 * When it does NOT work: choppy, range-bound markets where EMAs
 * cross repeatedly and ATR stops get whipsawed — generates small
 * losses that compound.
 */

function onUpdate(ctx) {
    // ATR-based trailing stop parameters
    const atrPeriod  = 14;   // ATR lookback — measures recent volatility
    const atrMult    = 3.0;  // stop distance = 3.0 × ATR — wider than 2.5 to let winners run longer
    const fastPeriod = 9;    // fast EMA — reacts quickly to price moves
    const slowPeriod = 21;   // slow EMA — defines the trend direction

    // Read indicators (previous closed bar = safe, ago=1)
    const atr  = ctx.atr(atrPeriod, 1);
    const emaF = ctx.ema(fastPeriod, 1);
    const emaS = ctx.sma(slowPeriod, 1); // sma is more stable for slow MA
    const emaF_prev = ctx.ema(fastPeriod, 2);
    const emaS_prev = ctx.sma(slowPeriod, 2);

    // Warm-up guard
    if (atr == null || emaF == null || emaS == null ||
        emaF_prev == null || emaS_prev == null) return null;

    // --- ENTRY LOGIC: EMA golden cross (fast crosses above slow) ---
    const goldenCross = emaF_prev <= emaS_prev && emaF > emaS;

    // --- EXIT LOGIC: EMA death cross (fast crosses below slow) ---
    const deathCross  = emaF_prev >= emaS_prev && emaF < emaS;

    // --- POSITION MANAGEMENT ---
    if (ctx.position === 0) {
        // No position — look for entry
        if (goldenCross) {
            // Buy with full cash, leave 1% buffer for slippage
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Have a position — look for exit
        // Compute trailing stop: current price minus N × ATR
        // Stop only moves UP (in favour of the trade), never down
        const trailingStop = ctx.price - atrMult * atr;

        // If in profit, enforce trailing stop; if in loss, rely on death cross
        const inProfit = ctx.price > ctx.entryPx;

        if (deathCross) {
            // Trend reversal — exit immediately
            return { side: 'sell', qty: ctx.position };
        }

        if (inProfit && ctx.price < trailingStop) {
            // Trailing stop triggered — exit
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
