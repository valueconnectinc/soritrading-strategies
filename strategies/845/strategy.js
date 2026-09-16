/*
 * @coinsori-strategy v1
 * name: Market Maker Sentiment Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy attempts to detect market maker sentiment by using Order Book data.
 * It looks for signs of large orders or imbalances in the order book that may indicate
 * upcoming price movements. A key signal is when bid-ask spread widens significantly,
 * suggesting potential manipulation or accumulation by large players.
 *
 * The strategy aims to enter the market before significant moves happen, using the
 * order book data to predict directional bias. It enters short when spread gets too wide
 * and the total bid volume drops below a threshold, indicating a possible seller accumulation.
 * For long positions, it looks for a decrease in ask volume with narrowing spread, suggesting
 * buyer accumulation.
 *
 * This strategy does not work well in highly liquid or low volatility markets where
 * significant order book imbalances are rare.
 */
function onUpdate(ctx) {
    // Fetch required data from order book
    const bid = ctx.bid();
    const ask = ctx.ask();
    const spread = ctx.spread();
    const spreadPct = ctx.spreadPct();
    const bidDepth = ctx.depth('bid', 100); // 100 units of depth
    const askDepth = ctx.depth('ask', 100);

    // Handle warm-up period
    if (bid == null || ask == null || spread == null || spreadPct == null ||
        bidDepth == null || askDepth == null) {
        return null;
    }

    // Define thresholds
    const maxSpreadPct = 3.0; // 3% maximum spread percentage before signaling
    const minBidVolume = 200; // Minimum bid volume threshold
    const minAskVolume = 200; // Minimum ask volume threshold

    // Short condition: Large spread and decreasing bid volume, suggesting seller accumulation
    const shortCondition = spreadPct > maxSpreadPct && bidDepth < minBidVolume;

    // Long condition: Narrowing spread and decreasing ask volume, suggesting buyer accumulation
    const longCondition = spreadPct < maxSpreadPct && askDepth < minAskVolume;

    ctx.log(`Spread: ${spread}, Spread %: ${spreadPct}`);
    ctx.log(`Bid Depth: ${bidDepth}, Ask Depth: ${askDepth}`);
    ctx.log(`Short Condition: ${shortCondition}, Long Condition: ${longCondition}`);

    if (shortCondition) {
        return { side: 'sell', qty: ctx.position }; // Close existing position if any or open short
    } else if (longCondition) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 }; // Open long
    }

    return null;
}
