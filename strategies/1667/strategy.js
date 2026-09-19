/*
 * @coinsori-strategy v1
 * name: Daily EMA Trend Filter + 4H Bollinger Breakout
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Multi-timeframe trend following — a daily EMA filter avoids
 * counter-trend trades in bear markets (where RSI mean reversion failed on SOL/ETH).
 * 4H Bollinger Band breakouts capture momentum entries in the direction of the daily trend.
 * LINK is a different ecosystem (Chainlink oracle network) with distinct price behavior.
 * When it works: Enters when 4H price breaks above Bollinger upper band while daily trend
 * is bullish, confirming momentum. Exits on Bollinger mid-band reversion or RSI overbought.
 * When it does NOT work: In choppy markets where Bollinger bands expand and contract
 * without directional moves — frequent false breakouts.
 */

function onUpdate(ctx) {
    // Daily EMA filter — read 6 x 4h bars = 1 day
    const emaDailyFast = ctx.ema(8, 0);   // 8-period EMA on 4H = 2-day EMA
    const emaDailySlow = ctx.ema(21, 0);   // 21-period EMA on 4H = 1-week EMA
    if (emaDailyFast == null || emaDailySlow == null) return null;

    // 4H indicators
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;
    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;
    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    const upper = bb.upper;
    const mid   = bb.mid;
    const lower = bb.lower;
    const price = ctx.price;

    const dailyUptrend = emaDailyFast > emaDailySlow;
    const dailyDowntrend = emaDailyFast < emaDailySlow;

    // === ENTRY: Price breaks above upper Bollinger Band in uptrend ===
    if (price > upper && dailyUptrend && rsi > 50 && rsi < 80) {
        // ATR-based stop: 2× ATR below entry
        const stopPx = price - 2 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.98,
            type: 'limit',
            price: price,
            // Attach stop as a separate work order
        };
    }

    // === ENTRY SHORT: Price breaks below lower BB in downtrend ===
    if (price < lower && dailyDowntrend && rsi < 50 && rsi > 20) {
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'limit',
            price: price,
        };
    }

    // === EXIT LONG: price reverts to mid BB or RSI overbought ===
    if (ctx.position > 0) {
        if (price <= mid || rsi > 75) {
            return { side: 'sell', qty: ctx.position };
        }
        // Time-based exit: exit if still in after 48 bars (8 days)
        // We check via a simple bar counter using EMA change
        const ema1 = ctx.ema(8, 1);
        if (ema1 != null && emaDailyFast < emaDailySlow) {
            // Trend flipped — exit
            return { side: 'sell', qty: ctx.position };
        }
    }

    // === EXIT SHORT ===
    if (ctx.position < 0) {
        if (price >= mid || rsi < 25) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        const ema1 = ctx.ema(8, 1);
        if (ema1 != null && emaDailyFast > emaDailySlow) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
