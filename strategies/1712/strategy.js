/*
 * @coinsori-strategy v1
 * name: RSI Divergence Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: RSI divergence catches micro-reversals — when price makes a lower low
 * but RSI makes a higher low, the selling pressure is weakening and a bounce is likely.
 * This is a fundamentally different mechanism from squeeze-breakout and should work in
 * trending-but-correcting markets where squeeze strategies fail.
 * When it buys and sells: Buy when RSI bullish divergence fires (price LL but RSI HL),
 * with RSI below 40 to confirm oversold exhaustion. Sell on bearish divergence or when
 * RSI reaches overbought (65+).
 * When it does NOT work: Strong one-directional trends without pullbacks — the divergence
 * keeps forming but never resolves, causing repeated small losses. Also fails in choppy
 * low-volume markets where RSI oscillates randomly.
 */
function onUpdate(ctx) {
    // RSI(14) on previous closed bar for divergence detection
    const rsiCur = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    const rsi3 = ctx.rsi(14, 3);
    const rsi4 = ctx.rsi(14, 4);

    // Price reference
    const priceCur = ctx.price;
    const price1 = ctx.closes[1];
    const price2 = ctx.closes[2];
    const price3 = ctx.closes[3];
    const price4 = ctx.closes[4];

    if (rsiCur == null || rsi1 == null || rsi2 == null || rsi3 == null || rsi4 == null) return null;

    // ── OPEN POSITION LOGIC ──────────────────────────────────────────────
    if (ctx.position === 0) {
        // BULLISH DIVERGENCE: price making lower lows, RSI making higher lows
        // Check last 4 bars for a swing low pattern
        const priceLows = [priceCur, price1, price2, price3, price4];
        const rsiLows   = [rsiCur, rsi1,  rsi2,  rsi3,  rsi4];

        // Find the lowest price bar among last 5
        let lowestPriceIdx = 0;
        for (let i = 1; i < priceLows.length; i++) {
            if (priceLows[i] < priceLows[lowestPriceIdx]) lowestPriceIdx = i;
        }

        // If the lowest price was 2-4 bars ago (allowing current bar to still be forming)
        const barsAgo = lowestPriceIdx; // 0=current, 1=prev, etc.

        if (barsAgo >= 2 && barsAgo <= 4) {
            // Check: price made a lower low vs the bar before the lowest
            const beforeLowest = barsAgo + 1;
            if (beforeLowest < priceLows.length) {
                const priceBefore = priceLows[beforeLowest];
                const priceLowest = priceLows[barsAgo];
                const isLowerLow = priceLowest < priceBefore;

                // Check RSI is making a higher low vs the same comparison point
                const rsiLowest = rsiLows[barsAgo];
                const rsiBefore = rsiLows[beforeLowest];
                const isHigherRSILow = rsiLowest > rsiBefore;

                // RSI must be in oversold territory (< 45) at the divergence low
                const rsiAtLow = rsiLows[barsAgo];
                const isOversold = rsiAtLow < 45;

                if (isLowerLow && isHigherRSILow && isOversold) {
                    // Additional confirmation: RSI is rising from the low
                    const rsiPrev = rsiLows[barsAgo - 1];
                    const rsiRising = rsiPrev != null && rsiCur > rsiPrev;
                    if (rsiRising) {
                        return { side: 'buy', qty: ctx.cash / priceCur * 0.99 };
                    }
                }
            }
        }
    }

    // ── CLOSE POSITION LOGIC ─────────────────────────────────────────────
    if (ctx.position > 0) {
        // SELL 1: Bearish divergence — price making higher highs, RSI making lower highs
        const priceHighs = [priceCur, price1, price2, price3, price4];
        const rsiHighs   = [rsiCur, rsi1,  rsi2,  rsi3,  rsi4];

        let highestPriceIdx = 0;
        for (let i = 1; i < priceHighs.length; i++) {
            if (priceHighs[i] > priceHighs[highestPriceIdx]) highestPriceIdx = i;
        }

        const barsAgoHigh = highestPriceIdx;

        if (barsAgoHigh >= 2 && barsAgoHigh <= 4) {
            const beforeHigh = barsAgoHigh + 1;
            if (beforeHigh < priceHighs.length) {
                const priceBefore = priceHighs[beforeHigh];
                const priceHighest = priceHighs[barsAgoHigh];
                const isHigherHigh = priceHighest > priceBefore;

                const rsiHighest = rsiHighs[barsAgoHigh];
                const rsiBefore = rsiHighs[beforeHigh];
                const isLowerRSIHigh = rsiHighest < rsiBefore;

                // RSI must be in overbought territory at the divergence high
                const isOverbought = rsiHighest > 55;

                if (isHigherHigh && isLowerRSIHigh && isOverbought) {
                    return { side: 'sell', qty: ctx.position };
                }
            }
        }

        // SELL 2: RSI reaches overbought zone (70+)
        if (rsiCur > 70) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 3: Take profit — RSI normalized and falling from overbought
        // If RSI was above 65 and now falling, exit
        const rsi5ago = ctx.rsi(14, 5);
        if (rsi5ago != null && rsi5ago > 65 && rsiCur < rsi5ago) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 4: Stop loss — price drops 5% from entry
        const entryPx = ctx.entryPx || priceCur;
        if (priceCur < entryPx * 0.95) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
