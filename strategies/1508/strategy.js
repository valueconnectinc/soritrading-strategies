/*
 * @coinsori-strategy v1
 * name: ATR Ratio Regime RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR ratio (current ATR / EMA ATR) measures trend STRENGTH
 * — high ratio = trending/volatile market, low ratio = chop/sideways. This is
 * more robust than a single EMA cross because it captures the market's volatility
 * regime, not just direction. Exp 360 (bare EMA20 cross) failed with 212 trades
 * and -44% because EMA cross alone can't distinguish trending from choppy.
 * When it buys and sells: Buy when ATR ratio > 1.3 (trending confirmed), price
 * above EMA20, and RSI(14) pulls back into 35-55 zone. Sell when ATR ratio drops
 * below 0.8 (chop), RSI>70 (overbought), or price drops below EMA20.
 * When it does NOT work: In slow grinding uptrends with moderate ATR (1.0-1.3)
 * the strategy stays in cash and misses the move. Also loses to buy-hold in
 * sustained SOL pumps where ATR spikes then fades — the exit fires too early.
 */
function onUpdate(ctx) {
    const ema20  = ctx.ema(20);
    const atr    = ctx.atr(14);
    const rsi    = ctx.rsi(14);
    const price  = ctx.price;
    const pos    = ctx.position;

    // Warm-up guard
    if (ema20 == null || atr == null || rsi == null) return null;

    // ── ATR ratio: current ATR vs its EMA — regime strength detector ──
    // Compute EMA of ATR inline using a simple smoothed approach.
    // We track state in closure vars (safe — onUpdate is called sequentially).
    if (atrRatio._atr == null) {
        atrRatio._atr    = [];
        atrRatio._smooth = atr;
    }
    atrRatio._atr.push(atr);
    if (atrRatio._atr.length > 20) atrRatio._atr.shift();
    const atrSum = atrRatio._atr.reduce(function(a, b) { return a + b; }, 0);
    const atrEma = atrSum / atrRatio._atr.length;
    // Smooth ATR EMA update (approximate EMA)
    atrRatio._smooth = atrRatio._smooth * 0.9 + atr * 0.1;
    const ratio = atr / Math.max(atrRatio._smooth, 0.0001);

    // ── EXIT LOGIC ─────────────────────────────────────────────
    if (pos > 0) {
        // Exit 1: chop returning — ATR ratio drops below 0.8
        if (ratio < 0.8) {
            ctx.log('ATR ratio=' + ratio.toFixed(2) + ' < 0.8 chop, exit');
            return { side: 'sell', qty: pos };
        }
        // Exit 2: overbought
        if (rsi > 70) {
            ctx.log('RSI=' + rsi.toFixed(1) + ' > 70 overbought, exit');
            return { side: 'sell', qty: pos };
        }
        // Exit 3: trend broken — price drops below EMA20
        if (price < ema20) {
            ctx.log('Price below EMA20, exit');
            return { side: 'sell', qty: pos };
        }
    }

    // ── ENTRY LOGIC ─────────────────────────────────────────────
    if (pos === 0) {
        // Only enter in confirmed trending market (ATR ratio > 1.3)
        if (ratio <= 1.3) return null;

        // Price must be above EMA20 — confirms we're in an uptrend
        if (price <= ema20) return null;

        // RSI pullback zone: 35-55.
        // Below 35 = oversold (too risky — could keep falling),
        // above 55 = not enough pullback (bad risk/reward).
        if (rsi >= 35 && rsi <= 55) {
            ctx.log('BUY ATRratio=' + ratio.toFixed(2) + ' EMA=' + ema20.toFixed(2) + ' RSI=' + rsi.toFixed(1));
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    return null;
}

// Module-level state for ATR ratio tracking
var atrRatio = { _atr: null, _smooth: null };
