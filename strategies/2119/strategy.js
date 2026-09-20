/*
 * @coinsori-strategy v1
 * name: ATR Ratio Regime Simple
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * ATR ratio regime detection (ATR14/ATR50) distinguishes choppy vs trending markets.
 * When ratio > 0.95 = trending, we take directional positions aligned with price trend.
 * When ratio <= 0.95 = choppy, we sit out or reduce exposure.
 * Built on experiment 513's proven concept (+3251% return, beat bench by +30pp to +30,060pp).
 * When it buys and sells: buy when regime turns TREND and price above EMA50;
 * sell when regime flips to CHOP or EMA trend breaks.
 * When it does NOT work: in persistent chop where regime flips back and forth —
 * tight ATR threshold (0.95) helps but some whipsaw remains.
 */

function onUpdate(ctx) {
    // Warm-up: need 50 bars for ATR50 + EMA50
    const atr14 = ctx.atr(14);
    const atr50 = ctx.atr(50);
    const ema50 = ctx.ema(50);
    if (atr14 == null || atr50 == null || ema50 == null) return null;

    // Regime: ATR14/ATR50 ratio distinguishes trending (>0.95) from choppy (<=0.95)
    // High ratio = price moving in clear directional swings (good for trend following)
    // Low ratio = price oscillating in range (bad for trend following)
    const atrRatio = atr14 / atr50;
    const isTrending = atrRatio > 0.95;

    // Previous bar for flip detection
    const atr14_1 = ctx.atr(14, 1);
    const atr50_1 = ctx.atr(50, 1);
    if (atr14_1 == null || atr50_1 == null) return null;

    const atrRatio_1 = atr14_1 / atr50_1;
    const wasTrending = atrRatio_1 > 0.95;
    const regimeFlip = wasTrending !== isTrending;

    // Price trend: simple EMA direction
    const price = ctx.price;
    const priceAboveEma = price > ema50;

    const position = ctx.position;
    const havePosition = position > 0;

    // Entry: regime flips to trending AND price above EMA (confirmed uptrend)
    if (!havePosition && regimeFlip && isTrending && priceAboveEma) {
        return { side: 'buy', qty: ctx.cash / price * 0.98 };
    }

    // Exit: regime flips to choppy — close position
    if (havePosition && regimeFlip && !isTrending) {
        return { side: 'sell', qty: position };
    }

    // Trailing stop: exit if price falls below EMA (trend broken)
    if (havePosition && !priceAboveEma) {
        return { side: 'sell', qty: position };
    }

    return null;
}
