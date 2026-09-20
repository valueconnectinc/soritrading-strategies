/*
 * @coinsori-strategy v1
 * name: ATR Regime + EMA Trend Filter
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * ATR ratio regime detection (ATR14/ATR50) distinguishes choppy vs trending markets.
 * In trending markets we take directional positions; in choppy markets we reduce size.
 * An EMA filter adds trend confirmation to avoid buying into downtrends.
 * This builds on experiment 513 which showed +3060pp/+986pp/+30pp outperformance.
 * When it buys and sells: buy when regime turns TREND and EMA confirms direction;
 * sell when regime flips to CHOP or when EMA flips against position.
 * When it does NOT work: choppy ranging markets with no clear direction —
 * the regime filter still generates some trades that whipsaw.
 */

function onUpdate(ctx) {
    // Warm-up guard
    const atr14 = ctx.atr(14);
    const atr50 = ctx.atr(50);
    const ema50 = ctx.ema(50);
    if (atr14 == null || atr50 == null || ema50 == null) return null;

    // Regime: ATR ratio > 0.95 = trending, <= 0.95 = choppy
    const atrRatio = atr14 / atr50;
    const isTrending = atrRatio > 0.95;

    // Previous bar values for signal detection
    const atr14_1 = ctx.atr(14, 1);
    const atr50_1 = ctx.atr(50, 1);
    const ema50_1 = ctx.ema(50, 1);
    if (atr14_1 == null || atr50_1 == null || ema50_1 == null) return null;

    const atrRatio_1 = atr14_1 / atr50_1;
    const wasTrending = atrRatio_1 > 0.95;

    // Regime flip signals
    const regimeFlipUp = !wasTrending && isTrending;   // chop → trend
    const regimeFlipDown = wasTrending && !isTrending;  // trend → chop

    // EMA trend direction: price above EMA = long bias
    const price = ctx.price;
    const priceAboveEma = price > ema50;

    // Previous bar: was price above previous EMA?
    const price_1 = ctx.sma(1, 1);  // close of previous bar
    const priceAboveEma_1 = price_1 > ema50_1;

    // EMA cross signals
    const emaCrossUp = !priceAboveEma_1 && priceAboveEma;
    const emaCrossDown = priceAboveEma_1 && !priceAboveEma;

    const position = ctx.position;
    const havePosition = position > 0;

    // Entry 1: regime flips chop→trend AND price above EMA (confirmed uptrend)
    if (!havePosition && regimeFlipUp && priceAboveEma) {
        return { side: 'buy', qty: ctx.cash / price * 0.98 };
    }

    // Entry 2: EMA cross up while in trending regime
    if (!havePosition && emaCrossUp && isTrending) {
        return { side: 'buy', qty: ctx.cash / price * 0.98 };
    }

    // Exit 1: regime flips to chop — take profit, reduce exposure
    if (havePosition && regimeFlipDown) {
        return { side: 'sell', qty: position };
    }

    // Exit 2: EMA crosses against position (trend reversal)
    if (havePosition && emaCrossDown) {
        return { side: 'sell', qty: position };
    }

    // Stop-loss: 3% hard stop (tight — XRP is volatile)
    if (havePosition) {
        const entryPx = ctx.entryPx;
        if (entryPx > 0) {
            const lossPct = (price - entryPx) / entryPx;
            if (lossPct < -0.03) {
                return { side: 'sell', qty: position };
            }
        }
    }

    return null;
}
