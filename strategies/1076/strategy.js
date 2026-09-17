/*
 * @coinsori-strategy v1
 * name: SMA-50 Buy-the-Dip 1h
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: SMA-50 is a smooth trend line on 1h bars — price
 * bouncing off it signals healthy pullbacks in a bull trend, not reversals.
 * We buy the bounce with a wide 10% stop to let the trend breathe.
 *
 * When it buys and sells: Buy when price pulls back TO or just below SMA-50
 * AND RSI is in the 35-55 zone (oversold but not dead). Sell when price
 * closes above SMA-50 + 8% (trailing profit target) or when RSI drops
 * below 30 (panic), or 10% stop.
 *
 * When it does NOT work: In bear markets price never bounces cleanly off SMA-50
 * — it gaps through. Also fails in low-volatility chop where RSI oscillates
 * around 40-50 and no clear entry fires.
 */

function onUpdate(ctx) {
    const sma50 = ctx.sma(50);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (sma50 == null || rsi == null) return null;

    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    const hasPos = ctx.position > 0;

    // Entry: price at or below SMA-50 + RSI bouncing from oversold zone
    const atSupport = price <= sma50 * 1.02; // within 2% of SMA-50
    const rsiBounce = rsi2 < 40 && rsi1 >= 40;
    const rsiZone    = rsi > 35 && rsi < 55;  // not overheated

    if (!hasPos && atSupport && rsiBounce && rsiZone) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // Exit: price ran up 8% from entry (trailing profit target)
    const profitTarget = ctx.entryPx > 0 && (price - ctx.entryPx) / ctx.entryPx > 0.08;
    // RSI panic: dropped below 30
    const rsiPanic = rsi < 30;
    // 10% stop-loss
    const stopLoss = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.10;

    if (hasPos && (profitTarget || rsiPanic || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
