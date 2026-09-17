/*
 * @coinsori-strategy v1
 * name: MACD Trend Follower
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * MACD (12,26,9) trend-following on daily BTCUSDT. Enters when MACD crosses
 * above its signal line while price is above the 200-day EMA (confirmed uptrend).
 * Exits when MACD crosses below signal line (momentum shift). This bets on
 * sustained directional moves rather than mean reversion.
 * When it does NOT work: choppy markets where MACD flips repeatedly, causing
 * whipsaws and small losses that compound. Also fails in prolonged bear trends
 * where price briefly pierces EMA200.
 */

function onUpdate(ctx) {
    // Trend filter: price must be above EMA200 to be in a bull regime
    const ema200 = ctx.ema(200);
    if (ema200 == null || ctx.price == null) return null;

    const bull = ctx.price > ema200;

    // MACD: standard parameters 12/26/9
    const macdNow  = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);

    // Guard against null values during warm-up
    if (!macdNow || !macdPrev) return null;

    const { macd: mNow,  signal: sNow  } = macdNow;
    const { macd: mPrev, signal: sPrev } = macdPrev;

    if (mNow == null || sNow == null || mPrev == null || sPrev == null) return null;

    // Check for open orders to avoid duplicate entries
    const open = ctx.openOrders();
    const hasOpenBuy  = open.some(o => o.side === 'buy');
    const hasOpenSell = open.some(o => o.side === 'sell');

    // ENTRY: MACD crosses above signal line while in bull regime
    // Previous bar: MACD <= signal  →  Current bar: MACD > signal
    if (!hasOpenBuy && !hasOpenSell && bull) {
        if (mPrev <= sPrev && mNow > sNow) {
            // Market buy — use almost all cash
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.998 };
        }
    }

    // EXIT: MACD crosses below signal line (momentum weakening)
    // Previous bar: MACD >= signal  →  Current bar: MACD < signal
    if (hasOpenBuy && mPrev >= sPrev && mNow < sNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
