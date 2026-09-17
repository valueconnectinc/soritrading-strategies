/*
 * @coinsori-strategy v1
 * name: BB Trend-Follow 1h BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Bollinger Bands identify when price compresses before
 * explosive moves. We buy when price breaks above the upper band with
 * expanding bandwidth (volatility breakout) — capturing momentum bursts.
 *
 * When it buys and sells: Buy when price closes above the upper Bollinger Band
 * AND the bandwidth (upper - lower) is expanding (volatility rising). This
 * avoids false breakouts in compressed, low-volatility markets. Sell when
 * price closes below the middle band (SMA-20) or 5% stop-loss.
 *
 * When it does NOT work: In slow grinding uptrends where price drifts above
 * the band without a sharp candle, the breakout signal misses the entry.
 * Also fails in choppy markets where bands expand and contract repeatedly.
 */

function onUpdate(ctx) {
    const bb    = ctx.bb(20, 2);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (bb == null || rsi == null) return null;

    const bb_1  = ctx.bb(20, 2, 1);
    if (bb_1 == null) return null;

    const hasPos = ctx.position > 0;

    // Previous bar bandwidth for expansion check
    const bwPrev  = bb_1.upper - bb_1.lower;
    const bwCurr  = bb.upper - bb.lower;
    const expanding = bwCurr > bwPrev;

    // Price breaks above upper band + bandwidth expanding = momentum breakout
    const breakout = price > bb.upper && expanding;

    // RSI healthy (not overheated, not dead)
    const rsiOk = rsi > 40 && rsi < 80;

    if (!hasPos && breakout && rsiOk) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // Exit: price closes below middle band or 5% stop
    const belowMiddle = price < bb.middle;
    const stopLoss = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.05;

    if (hasPos && (belowMiddle || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
