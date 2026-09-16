/*
 * @coinsori-strategy v1
 * name: MACD + RSI Mean Reversion Strategy With Market Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy applies mean reversion logic using MACD and RSI signals, but filters the market conditions using a DXY (Dollar Index) reading. It assumes that when the dollar index is above a certain level, it may indicate an overbought market, making reversal trades more favorable. Otherwise, the strategy waits for better conditions.
 *
 * When it buys and sells: The strategy enters long when MACD crosses above signal line and RSI is below 30 (oversold), but only if DXY reading is below 105 (indicating dollar strength is not too high). It exits when RSI crosses above 70 (overbought) or MACD falls below its signal line.
 *
 * When it does NOT work: This strategy fails during strong trending markets where mean reversion logic is ineffective. Additionally, if the DXY market condition filter proves unreliable in volatile conditions, it may lead to missed opportunities or false signals.
 */

function onUpdate(ctx) {
    // === Get indicators ===
    const macd = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    const rsi = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    
    // === Get market condition using DXY data via ctx.data ===
    const dxy = ctx.data('dxy');
    
    // === Check for null values ===
    if (macd == null || macdPrev == null || rsi == null || rsiPrev == null || dxy == null) {
        return null;
    }
    
    // === Entry conditions ===
    const isOverSold = rsi < 30;
    const isCrossingUp = macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal;
    const isGoodMarket = dxy < 105;  // Dollar index below 105 indicates weaker dollar
    
    const shouldBuy = isOverSold && isCrossingUp && isGoodMarket;
    
    // === Exit conditions ===
    const isOverBought = rsi > 70;
    const isCrossingDown = macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal;
    
    const shouldSell = isOverBought || isCrossingDown;
    
    // === Position sizing ===
    let qty = 0;
    if (shouldBuy && ctx.position == 0) {
        qty = ctx.cash / ctx.price * 0.95; // Use 95% of cash for position
    } else if (shouldSell && ctx.position > 0) {
        qty = ctx.position; // Close full position
    }
    
    return qty ? { side: shouldBuy ? 'buy' : 'sell', qty: qty } : null;
}
