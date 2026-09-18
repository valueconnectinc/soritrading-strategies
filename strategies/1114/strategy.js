/*
 * @coinsori-strategy v1
 * name: SMA Cross 20/50 Diagnostic
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Minimal SMA crossover — pure diagnostic to confirm the engine
 * executes orders. No complex state, no indicators beyond sma.
 * Buy when SMA(20) crosses above SMA(50), sell on reverse.
 */

function onUpdate(ctx) {
    if (ctx.i < 55) return null;
    const emaF = ctx.ema(20);
    const emaS = ctx.ema(50);
    if (emaF == null || emaS == null) return null;

    const emaF1 = ctx.ema(20, 1);
    const emaS1 = ctx.ema(50, 1);
    if (emaF1 == null || emaS1 == null) return null;

    if (emaF1 <= emaS1 && emaF > emaS && ctx.position <= 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    if (emaF1 >= emaS1 && emaF < emaS && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }
    return null;
}
