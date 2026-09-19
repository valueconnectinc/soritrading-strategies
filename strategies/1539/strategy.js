/*
 * @coinsori-strategy v1
 * name: Supertrend RSI Hybrid — DOGEUSDT 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Supertrend captures trend changes using ATR volatility bands
 * around an EMA anchor — it adapts to DOGE's high volatility. RSI confirms exits
 * to avoid holding through reversals. This family (Supertrend+RSI) worked on
 * SOLUSDT 4H (Exp 1452: successful). DOGE also showed positive mean-reversion
 * results before. Testing if Supertrend works on DOGE's larger trends.
 * When it buys and sells: Buy on Supertrend bullish flip. Sell on bearish flip,
 * RSI overbought (>65), or ATR-based stop/target.
 * When it does NOT work: Choppy range-bound markets cause frequent flips and
 * whipsaws — each false flip triggers a trade that stops out for a small loss.
 */
let prevTrend = 0;

function onUpdate(ctx) {
    const ema  = ctx.ema(20);
    const atr  = ctx.atr(14);
    const rsi  = ctx.rsi(14, 1);
    if (ema == null || atr == null || rsi == null) return null;

    const price = ctx.price;

    // ATR multiplier: 4.0 for DOGE (more volatile than SOL's 2.5)
    const upperBand = ema + 4.0 * atr;
    const lowerBand = ema - 4.0 * atr;

    let trend;
    if (prevTrend === 0) {
        trend = price >= upperBand ? 1 : -1;
    } else if (prevTrend === 1) {
        trend = price < lowerBand ? -1 : 1;
    } else {
        trend = price > upperBand ? 1 : -1;
    }

    const bullFlip = prevTrend !== 0 && prevTrend === -1 && trend === 1;
    const bearFlip = prevTrend !== 0 && prevTrend === 1  && trend === -1;

    prevTrend = trend;

    const position = ctx.position;

    // BUY: Supertrend flipped bullish
    if (position === 0 && bullFlip) {
        // Risk 2% of cash per trade, stop at 2×ATR below entry
        const stopPx = price - 2.0 * atr;
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price - stopPx);
        if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
    }

    // SELL: Supertrend flipped bearish, RSI overbought, stop, or target
    if (position > 0) {
        const rsiOverbought = rsi > 65;
        const hardStop = price - 2.5 * atr;
        const tpPx    = price + 6.0 * atr;

        if (bearFlip || rsiOverbought || price <= hardStop || price >= tpPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
