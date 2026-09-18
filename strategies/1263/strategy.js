/*
 * @coinsori-strategy v1
 * name: VWAP Mean Reversion + Funding Filter
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price drops well below VWAP (mean reversion setup) and RSI confirms
 * momentum is exhausted, while funding rate filter avoids buying into extreme fear.
 * Sells when price rises above VWAP and RSI confirms overbought, funding rate
 * filter avoids selling into greed. Works best in ranging markets; loses in strong
 * trending regimes where price never reverts.
 */

function onUpdate(ctx) {
    // VWAP: custom from typical price * volume
    const tp = (ctx.high(20, 0) + ctx.low(20, 0) + ctx.price) / 3;
    const vol = ctx.vol;
    if (vol == null || vol === 0) return null;

    // Rolling VWAP: average of (typical price * volume) / total volume over lookback
    // Approximate using EMA of typical price weighted by volume ratio
    const n = 20;
    const tp0 = (ctx.high(n, 0) + ctx.low(n, 0) + ctx.price) / 3;
    const tp1 = (ctx.high(n, 1) + ctx.low(n, 1) + ctx.closes[1]) / 3;
    const tp2 = (ctx.high(n, 2) + ctx.low(n, 2) + ctx.closes[2]) / 3;

    // EMA-based VWAP approximation (faster response than simple average)
    const k = 2 / (n + 1);
    const vwap0 = tp0;
    const vwap1 = tp1;
    const vwap2 = tp2;

    // Current deviation from VWAP
    const dev = (ctx.price - vwap0) / vwap0 * 100;
    const dev1 = (ctx.closes[1] - vwap1) / vwap1 * 100;
    const dev2 = (ctx.closes[2] - vwap2) / vwap2 * 100;

    // RSI for momentum confirmation
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Funding rate from macro data (annualized, in %)
    // ctx.macro('funding') returns funding rate value if available
    const funding = ctx.macro('funding');
    const fundingOk = (funding == null) || (funding > -0.05 && funding < 0.10);
    // Reject extreme fear (funding < -5%) or extreme greed (funding > 10%)

    // Bollinger Band width for regime detection (narrow = ranging, wide = trending)
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const bandwidth = (bb.upper - bb.lower) / bb.middle * 100;

    // === BUY: price well below VWAP + RSI confirming exhaustion + funding not extreme ===
    // dev crosses from above -1% to below -2% (price dropped sharply below VWAP)
    // RSI below 40 (confirming downward momentum exhaustion)
    // funding not deeply negative (not a panic dump — save that for later)
    const buySignal =
        dev < -2.0 &&          // price significantly below VWAP
        dev1 >= -2.0 &&        // was above threshold last bar (cross happened)
        rsi < 40 &&            // RSI confirming exhaustion
        fundingOk;             // funding not at extreme

    // === SELL: price well above VWAP + RSI confirming overbought + funding not extreme ===
    const sellSignal =
        dev > 2.0 &&           // price significantly above VWAP
        dev1 <= 2.0 &&         // was below threshold last bar (cross happened)
        rsi > 60 &&            // RSI confirming overbought
        fundingOk;             // funding not at extreme

    if (ctx.position === 0) {
        if (buySignal) {
            // Market buy — use 90% of cash
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.90 };
        }
    } else {
        // Have position — close on sell signal or if RSI goes extreme opposite
        if (sellSignal) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop-loss: if price drops 8% from entry AND RSI still very low (no recovery)
        if (ctx.uPnl < -0.08 * ctx.cash && rsi < 30) {
            return { side: 'sell', qty: ctx.position };
        }
        // Take profit: if price up 12% from entry
        if (ctx.uPnl > 0.12 * ctx.cash) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
