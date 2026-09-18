/*
 * @coinsori-strategy v1
 * name: EMA200 Pullback — Trend Continuation
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH often makes sharp pullbacks TO the EMA200 during uptrends
 * and snaps back quickly — a classic trend-continuation pattern. Rather than buying
 * oversold oscillators (which misses these pullback-to-trend setups), this strategy
 * waits for price to pull back TO the EMA200 and bounce, catching the resumption.
 * When it buys and sells: Buys when price is above EMA200 AND has just pulled back
 * within 0.5 ATR of EMA200 (confirmed by RSI between 35-55). Sells at 3% profit or
 * when price drops below EMA200.
 * When it does NOT work: In choppy markets where price oscillates around EMA200
 * without trending — generates many small losses. Fails in sustained downtrends.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    if (ema200 == null || rsi == null || atr == null) return null;

    const price    = ctx.price;
    const aboveEMA = price > ema200;

    // ── Entry: price above EMA200 (uptrend) AND pulled back to within 0.5 ATR ─
    // RSI 35-55 confirms the pullback is real but not yet overbought
    // Close(1) < ema200 ensures we are catching a pullback TO the EMA, not already above
    const distToEMA = Math.abs(price - ema200);
    const closePrev = ctx.closes[1];  // previous bar close
    const prevBelow = closePrev < ema200;

    if (ctx.position === 0 && aboveEMA && prevBelow && distToEMA < atr * 0.5 && rsi > 35 && rsi < 55) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit: 3% profit target OR trend broken ───────────────────────────────
    if (ctx.position > 0) {
        const entryPx = ctx.entryPx;
        const pnlPct  = (price - entryPx) / entryPx;

        if (pnlPct >= 0.03) return { side: 'sell', qty: ctx.position };  // 3% target
        if (!aboveEMA) return { side: 'sell', qty: ctx.position };          // trend broken
    }

    return null;
}
