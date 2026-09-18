/*
 * @coinsori-strategy v1
 * name: EMA20 Bounce + ATR Stop 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Price bouncing off EMA(20) — a simpler mean reversion signal than RSI
 * or Stochastic, with fewer false flips. EMA(20) acts as the "floor" in
 * uptrends; when price touches it and bounces, that's the entry.
 * Why this strategy: RSI and Stochastic oscillate too fast on 4H BTC
 * (Stochastic generated 93 trades and -65%). EMA(20) bounce is a cleaner
 * signal with fewer false entries. ATR stop is sized at 2.5× to survive
 * normal 4H noise without being too loose.
 * When it buys: price crosses above EMA(20) while RSI(14) < 60
 * (confirming we're not buying into strength).
 * When it sells: price crosses below EMA(20) OR ATR 2.5× stop OR 96-bar timeout.
 * When it does NOT work: in strong downtrends where price stays below EMA(20)
 * for extended periods and never bounces — the strategy just waits, which is
 * correct behaviour but means long periods without trades.
 */

function onUpdate(ctx) {
    if (ctx.i < 22) return null;

    const ema20 = ctx.ema(20);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    if (ema20 == null || rsi == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // Price crossed above EMA(20) — potential bounce entry
    const priceAboveEma = price > ema20;

    // Previous bar price vs EMA
    const closes   = ctx.closes;
    const prevPrice = closes?.[1];  // [0]=current, [1]=previous closed bar

    const prevAboveEma = prevPrice != null && prevPrice > ema20;
    const crossUp = !prevAboveEma && priceAboveEma;  // crossed ABOVE this bar

    // BUY: price crossed above EMA(20) AND RSI still below 60 (not extended)
    if (crossUp && rsi < 60 && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  EMA20_Bounce  qty=${qty.toFixed(4)}  price=${price}  EMA=${ema20.toFixed(1)}  RSI=${rsi.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // SELL 1: price crossed back below EMA(20)
    const crossDn = prevAboveEma && !priceAboveEma;
    if (crossDn && pos > 0) {
        ctx.log(`SELL EMA20_Break  qty=${pos}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // SELL 2: ATR stop — 2.5× ATR below entry
    if (entry > 0 && (entry - price) > atr * 2.5) {
        ctx.log(`SELL ATR_Stop  qty=${pos}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // SELL 3: 96-bar timeout
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 96) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
