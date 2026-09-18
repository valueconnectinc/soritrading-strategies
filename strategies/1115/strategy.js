/*
 * @coinsori-strategy v1
 * name: Stochastic %K Mean Reversion 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Stochastic %K mean-reversion on 4H BTC — a different signal family from
 * RSI and BB. Stochastic tracks position within the high-low range, making
 * it more responsive than RSI to local price action.
 * Why this strategy: Stochastic %K (no smoothing, raw) reacts faster than
 * RSI(14) and avoids the 0-trade problem that BB %B had. The %K crossover
 * from oversold (< 20) is a clean bounce signal.
 * When it buys: %K crosses above 20 (from below) — oversold bounce confirmed.
 * When it sells: %K crosses below 80 (from above) OR ATR 2× stop OR 96-bar timeout.
 * When it does NOT work: in strong downtrends where %K oscillates between
 * 10-40 and never bounces to 20, or in choppy markets with many false crosses.
 */

function onUpdate(ctx) {
    if (ctx.i < 15) return null;

    const stoch  = ctx.stoch(14, 3);
    const atr    = ctx.atr(14);
    if (stoch == null || atr == null) return null;

    const pctK    = stoch.k;
    const pctK1   = stoch.k ? ctx.stoch(14, 3, 1)?.k : null;
    if (pctK1 == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // ENTRY: %K crosses above 20 — oversold bounce
    const crossUp20 = pctK1 <= 20 && pctK > 20;

    if (crossUp20 && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  Stoch_Bounce  qty=${qty.toFixed(4)}  price=${price}  K=${pctK.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // EXIT 1: %K crosses below 80 — overbought
    const crossDn80 = pctK1 >= 80 && pctK < 80;

    if (crossDn80 && pos > 0) {
        ctx.log(`SELL Stoch_Upper  qty=${pos}  price=${price}  K=${pctK.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // EXIT 2: ATR stop — 2× ATR below entry
    if (entry > 0 && (entry - price) > atr * 2.0) {
        ctx.log(`SELL ATR_Stop  qty=${pos}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // EXIT 3: 96-bar timeout
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 96) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
