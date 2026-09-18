/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion + EMA200 Trend Filter — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price touches the lower Bollinger Band, RSI is below 35,
 * AND the EMA200 is rising (price above EMA200 = confirmed uptrend).
 * This triple filter avoids false mean-reversion trades in bear markets.
 * Sells when price reaches the middle Bollinger Band or RSI climbs above 65.
 * When it does NOT work: strong trending drops where price hugs the lower
 * band for weeks (2022 crash style). The EMA200 filter helps but cannot
 * eliminate all trending-breakdown losses.
 */

function onUpdate(ctx) {
    const bb    = ctx.bb(20, 2, 1);  // lower, mid, upper
    const rsi   = ctx.rsi(14, 1);
    const ema200 = ctx.ema(200, 1);
    if (bb == null || rsi == null || ema200 == null) return null;

    const lower  = bb.lower;
    const middle = bb.mid;
    if (lower == null || middle == null) return null;

    if (ctx.position === 0) {
        // Entry: price at lower band + RSI oversold + EMA200 rising (uptrend confirmed)
        // EMA200 rising means ema200 > ema200(2) — the trend line is tilting up
        const ema200_prev = ctx.ema(200, 2);
        const emaRising   = ema200_prev != null && ema200 > ema200_prev;
        if (ctx.price <= lower && rsi < 35 && emaRising) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Exit: price back to middle band OR RSI overbought
        if (ctx.price >= middle || rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
