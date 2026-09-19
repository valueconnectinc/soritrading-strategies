/*
 * @coinsori-strategy v1
 * name: MACD Momentum Breakout on BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 1,000
 *
 * Why this strategy: BTC has strong momentum cycles where MACD crossing above
 * its signal line captures the start of new uptrends. Unlike mean-reversion
 * (which bets on bounces), momentum strategies ride the trend. RSI confirms
 * the move isn't overextended. This is the opposite family from the BB/EMA20
 * pullback strategies tested earlier — adding diversity to the strategy pool.
 * When it buys and sells: Buy when MACD crosses above its signal line
 * (histogram turns positive) AND RSI > 50 (confirmed momentum, not weak).
 * Sell when MACD crosses below signal OR RSI drops below 45.
 * When it does NOT work: In choppy/ranging markets where MACD flips
 * constantly — produces whipsaws. Also fails at cycle tops where MACD
 * divergence precedes the drop.
 */
function onUpdate(ctx) {
    // ── MACD crossover (12, 26, 9 standard) ─────────────────────────
    const macdNow  = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    if (macdNow == null || macdPrev == null) return null;
    if (macdNow.hist == null || macdPrev.hist == null) return null;

    // MACD crossed above signal (histogram positive and was not before)
    const macdBullCross = macdPrev.hist <= 0 && macdNow.hist > 0;
    // MACD crossed below signal (histogram negative and was not before)
    const macdBearCross = macdPrev.hist >= 0 && macdNow.hist < 0;

    // ── RSI ─────────────────────────────────────────────────────────
    const rsiNow = ctx.rsi(14, 0);
    if (rsiNow == null) return null;

    // ── ATR regime cap ───────────────────────────────────────────────
    const atrNow = ctx.atr(14);
    if (atrNow == null) return null;
    // Reject extreme volatility (avoids entries during crisis dumps)
    if (atrNow / ctx.price > 0.08) return null;

    // ── Entry: MACD bullish cross + RSI confirming momentum ─────────
    if (ctx.position === 0) {
        if (macdBullCross && rsiNow > 50) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // ── Exit: MACD bearish cross OR momentum weakening ───────────────
    if (macdBearCross || rsiNow < 45) {
        return { side: 'sell', qty: ctx.position };
    }

    // ── Stop: 2× ATR below entry ─────────────────────────────────────
    const drawdown = ctx.entryPx - ctx.price;
    if (drawdown > 0 && drawdown > 2 * atrNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
