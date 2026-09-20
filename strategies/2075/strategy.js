/*
 * @coinsori-strategy v1
 * name: Donchian Breakout 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure price-breakout — no indicator lag, no overfitting.
 * 4H sits between the noise of 1H and the lag of 1D. The 20-bar lookback
 * is the classic turtle-trading period.
 * When it buys and sells: Buy when a candle closes above the 20-bar highest
 * high. Sell when a candle closes below the 10-bar lowest low.
 * When it does NOT work: In choppy markets price oscillates around the channel
 * boundaries, generating many whipsaws that erode gains.
 */

function onUpdate(ctx) {
    const hi20 = ctx.high(20);
    const lo10 = ctx.low(10);
    if (hi20 == null || lo10 == null) return null;

    // Previous bar's close — did it break above the 20-bar channel?
    const prevClose = ctx.closes[1];
    if (prevClose == null) return null;

    // ── ENTRY: previous candle confirmed the breakout (closed above 20-bar high)
    if (ctx.position === 0 && prevClose > hi20) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: price closes below 10-bar low (trailing stop equivalent)
    if (ctx.position > 0 && ctx.price < lo10) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
