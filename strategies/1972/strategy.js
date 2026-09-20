/*
 * @coinsori-strategy v1
 * name: Supertrend RSI Trend
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Supertrend (ATR-based price channel) with RSI confirmation for entries.
 * Why this strategy: Supertrend adapts to volatility automatically — it widens
 * bands in choppy markets and tightens in trends, reducing false breakouts that
 * plagued plain momentum on AVAXUSDT. RSI filter avoids buying into overbought
 * exhaustion and selling into oversold bounces.
 * When it buys and sells: Buy when Supertrend flips bullish AND RSI > 40 (confirming
 * upward momentum, not a dead-cat bounce). Sell when Supertrend flips bearish OR
 * RSI falls below 35 (stop momentum deterioration). No position if RSI is neutral.
 * When it does NOT work: In tight ranges where Supertrend flips repeatedly (choppy
 * market with no clear trend) — the ATR multiplier of 3 should limit this but
 * cannot eliminate it entirely. Also underperforms in sharp short squeezes that
 * reverse before Supertrend can exit.
 */

// Module-level state: persists between onUpdate calls
const _st = {
    trend: 1,       // 1 = uptrend, -1 = downtrend
    upperBand: 0,  // previous bar's upper band
    lowerBand: 0,  // previous bar's lower band
    init: false    // bands initialized?
};

function onUpdate(ctx) {
    const period = 14;
    const multiplier = 3;

    // Warm-up: ATR and RSI need enough bars
    const atr = ctx.atr(period);
    if (atr == null) return null;
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const close    = ctx.price;
    const prevHigh = ctx.high(1);
    const prevLow  = ctx.low(1);
    const prevClose = ctx.closes[1];

    // Bands computed from PREVIOUS bar (standard Supertrend algorithm)
    const prevHl2 = (prevHigh + prevLow) / 2;
    const upperBand = prevHl2 + multiplier * atr;
    const lowerBand = prevHl2 - multiplier * atr;

    // Initialize bands on first valid bar
    if (!_st.init) {
        _st.upperBand = upperBand;
        _st.lowerBand = lowerBand;
        _st.init = true;
    }

    // Supertrend flip logic:
    // Uptrend → flip to downtrend when prevClose was near upperBand AND close < lowerBand
    // Downtrend → flip to uptrend when prevClose was near lowerBand AND close > upperBand
    let flipped = false;
    let newTrend = _st.trend;

    if (_st.trend === 1 && prevClose <= _st.upperBand && close < lowerBand) {
        newTrend = -1;
        flipped = true;
    } else if (_st.trend === -1 && prevClose >= _st.lowerBand && close > upperBand) {
        newTrend = 1;
        flipped = true;
    }

    // ── Entry ──────────────────────────────────────────────
    if (ctx.position === 0) {
        if (flipped && newTrend === 1 && rsi > 40) {
            // Supertrend flipped bullish + RSI confirms upward momentum
            return { side: 'buy', qty: ctx.cash / close * 0.99 };
        }
        // Initial entry: strategy starts in uptrend — enter if already bullish
        if (!_st.init || !flipped) {
            if (_st.trend === 1 && close > lowerBand && rsi > 40) {
                return { side: 'buy', qty: ctx.cash / close * 0.99 };
            }
        }
    }

    // ── Exit ───────────────────────────────────────────────
    if (ctx.position > 0) {
        if (newTrend === -1 || rsi < 35) {
            return { side: 'sell', qty: ctx.position };
        }
    }
    if (ctx.position < 0) {
        if (newTrend === 1 || rsi > 60) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    // Update persisted state for next bar
    _st.trend     = newTrend;
    _st.upperBand = upperBand;
    _st.lowerBand = lowerBand;

    return null;
}
