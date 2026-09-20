/*
 * @coinsori-strategy v1
 * name: ATR-Adjusted RSI Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * ATR-based volatility bands replace Bollinger Bands as the entry/exit boundary.
 * The band width adapts to recent volatility (ATR), unlike BB which uses standard deviation.
 * Entry: RSI oversold (<30) + price breaks below the lower ATR band → buy.
 * Exit:  RSI overbought (>70) + price breaks above the upper ATR band → sell.
 * This strategy bets that AVAXUSDT oscillates around its ATR-defined range,
 * similar to how BB Mean Reversion (exp 476) captured mean-reversion on this pair.
 * When it does NOT work: strong sustained trends will hit the band and reverse
 * prematurely; the ATR band is wider than BB so fewer false signals but also fewer trades.
 */

function onUpdate(ctx) {
    // Previous closed bar indicators
    const rsi1 = ctx.rsi(14, 1);
    const atr1 = ctx.atr(14, 1);
    if (rsi1 == null || atr1 == null) return null;

    // ATR bands: upper = price + ATR, lower = price - ATR
    // Use previous close as proxy for previous-bar price
    const prevClose = ctx.closes[1];
    if (prevClose == null) return null;
    const upperBand = prevClose + atr1;
    const lowerBand = prevClose - atr1;

    // Entry: RSI oversold + price breaks below lower ATR band
    if (ctx.position === 0 && rsi1 < 30 && ctx.price < lowerBand) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Exit: RSI overbought + price breaks above upper ATR band
    if (ctx.position > 0 && rsi1 > 70 && ctx.price > upperBand) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
