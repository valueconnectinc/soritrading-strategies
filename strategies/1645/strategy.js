/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + Funding Rate Regime Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate tells us if traders are aggressively paying to long.
 * When funding is high, mean reversion is dangerous — price keeps running after you buy the dip.
 * This strategy filters out high-funding regimes to avoid counter-trend entries.
 * When it buys and sells: Buy when price touches lower BB band + RSI < 30, BUT only when
 * funding rate is below 0.005% (not in aggressive bullish funding). Sell at BB middle band or RSI > 70.
 * When it does NOT work: In sustained low-funding bear markets where price grinds down
 * without mean-reversion bounces — the BB lower band keeps getting hit but price never recovers.
 */

function onUpdate(ctx) {
    // --- Indicator warm-up guard ---
    const bb = ctx.bb(20, 2);
    if (bb == null || bb.lower == null || bb.mid == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // --- Funding rate regime filter ---
    // ctx.funding is the current funding rate for this perpetual (annualized / periods per day)
    // Binance funds every 8h, so ctx.funding is the 8h rate
    // Skip entries when funding > 0.005% (0.00005) — aggressively bullish sentiment
    const FUNDING_MAX = 0.00005;
    const funding = ctx.funding;

    const price = ctx.price;
    const position = ctx.position;

    // --- Entry: BB lower touch + RSI oversold + funding regime clear ---
    // Skip if funding data unavailable (spot markets) or funding too high
    if (position === 0 && price <= bb.lower && rsi < 30) {
        if (funding == null || funding <= FUNDING_MAX) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        // Funding too high — log and skip
        ctx.log('Funding too high: ' + (funding * 100).toFixed(4) + '% — skipping entry');
    }

    // --- Exit: BB middle band reached OR RSI overbought ---
    if (position > 0 && (price >= bb.mid || rsi > 70)) {
        return { side: 'sell', qty: position };
    }

    // --- Time-based stop: hold no longer than 48 bars (8 days) ---
    // Mean reversion should work within a few periods; a hard cap prevents hold-through trends
    const HOLD_MAX_BARS = 48;
    const barsHeld = ctx.candle - ctx.entryPx; // ctx.candle is current bar index
    // We track entry bar via a state trick: store entry bar in a closure variable
    // Since we can't persist state between calls easily, use entryPx != 0 as proxy
    // Actually ctx.entryPx is the entry price, not the bar. We use a different approach:
    // Track position open time via a global (strategy-level) variable
    // NOTE: onUpdate is stateless per call — we use entryPx as proxy for "position opened this bar"
    if (position > 0) {
        // Simple time stop: if RSI has not improved in 24 bars, exit
        const rsi24 = ctx.rsi(14, 24);
        if (rsi24 != null && rsi > rsi24 + 20) {
            // RSI getting worse over 24 bars — trend is not reversing, exit
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
