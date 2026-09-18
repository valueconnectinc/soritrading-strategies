/*
 * @coinsori-strategy v1
 * name: Funding Rate Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when funding rate is deeply negative (shorts paying longs = squeeze risk)
 * and RSI confirms oversold. Sells when funding rate normalizes above 0.005%.
 * When it does NOT work: in strong downtrends where funding stays negative and
 * price continues falling — the "squeeze" never materialises and losses mount.
 */
function onUpdate(ctx) {
    if (ctx.i < 30) return null;

    const rsi  = ctx.rsi(14);
    const atr  = ctx.atr(14);
    const funding = ctx.funding;

    if (rsi == null || atr == null || funding == null) return null;

    const price     = ctx.price;
    const noPos     = ctx.position === 0;
    const fundThresh = -0.0001; // -0.01%: deeply negative funding

    // ── BUY: funding deeply negative + RSI oversold
    // Negative funding = shorts paying longs → short squeeze risk
    // RSI < 35 = price oversold → bounce likely
    if (noPos && funding < fundThresh && rsi < 35) {
        const stopPx = price - Math.min(atr * 2, price * 0.08);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopLoss: stopPx
        };
    }

    // ── SELL: funding normalised (no longer deeply negative) OR RSI reached 60
    if (ctx.position > 0) {
        const fundNormalised = funding >= fundThresh;
        const rsiReverted   = rsi > 60;

        if (fundNormalised || rsiReverted) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
