/*
 * @coinsori-strategy v1
 * name: Volume Spike EMA RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volume spikes signal institutional activity — they filter out
 * the false breakouts and whipsaws that plagued bare EMA crosses (exp 360: 212 trades, -44%).
 * A volume spike > 1.8x its 20-bar average during a pullback means smart money is
 * accumulating into the dip, giving us a high-probability entry. Combined with EMA20
 * trend confirmation and RSI pullback timing.
 * When it buys and sells: Buy when volume > 1.8x its 20-bar avg, price above EMA20,
 * and RSI(14) is in the 35-55 pullback zone. Sell when RSI hits 70 or price drops
 * below EMA20.
 * When it does NOT work: In slow illiquid altcoin dumps where volume spikes are
 * panic-selling, not accumulation. Also misses entries in low-volume steady uptrends.
 */
function onUpdate(ctx) {
    const ema20  = ctx.ema(20);
    const rsi    = ctx.rsi(14);
    const price  = ctx.price;
    const pos    = ctx.position;

    // Warm-up guard
    if (ema20 == null || rsi == null) return null;

    // ── Volume spike: current vol vs 20-bar average ──────────────
    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;
    const volRatio = ctx.vol / avgVol;

    // ── EXIT LOGIC ─────────────────────────────────────────────
    if (pos > 0) {
        // Exit: overbought
        if (rsi > 70) {
            ctx.log('RSI=' + rsi.toFixed(1) + ' > 70 overbought, exit');
            return { side: 'sell', qty: pos };
        }
        // Exit: trend broken — price drops below EMA20
        if (price < ema20) {
            ctx.log('Price below EMA20, exit');
            return { side: 'sell', qty: pos };
        }
    }

    // ── ENTRY LOGIC ─────────────────────────────────────────────
    if (pos === 0) {
        // Volume spike required: > 1.8x average — institutional interest
        if (volRatio <= 1.8) return null;

        // Price must be above EMA20 — confirms we're in an uptrend
        if (price <= ema20) return null;

        // RSI pullback zone: 35-55 (sweet spot for mean reversion in trend)
        if (rsi >= 35 && rsi <= 55) {
            ctx.log('BUY volRatio=' + volRatio.toFixed(2) + ' EMA=' + ema20.toFixed(2) + ' RSI=' + rsi.toFixed(1));
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    return null;
}
