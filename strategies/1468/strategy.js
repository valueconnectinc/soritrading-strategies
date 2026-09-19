/*
 * @coinsori-strategy v1
 * name: RSI Extreme Zone Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI drops below 30 (deeply oversold) during an overall uptrend (price > SMA200).
 * Sells when RSI mean-reverts above 60 or price falls below SMA200.
 * This is a mean-reversion strategy — it bets on bounces from oversold extremes.
 * Works best in choppy markets with frequent wash-outs.
 * Loses in sustained downtrends where RSI stays oversold for long periods.
 */

function onUpdate(ctx) {
    const price   = ctx.price;
    const rsi     = ctx.rsi(14);
    const sma200  = ctx.sma(200);

    if (rsi == null || sma200 == null) return null;

    const position = ctx.position;

    // ── ENTRY: deeply oversold + still in uptrend ──
    if (position === 0 && rsi < 30 && price > sma200) {
        const riskAmt = ctx.cash * 0.02;
        const stopPx  = price * 0.94;          // 6% hard stop below entry
        const qty     = riskAmt / (price - stopPx);
        if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
    }

    // ── EXIT: RSI mean-reverts above 60 OR price falls below SMA200 ──
    if (position > 0) {
        const rsiReverted = rsi > 60;
        const downtrend    = price < sma200;
        if (rsiReverted || downtrend) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
