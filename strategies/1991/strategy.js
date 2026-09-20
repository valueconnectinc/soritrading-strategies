/*
 * @coinsori-strategy v1
 * name: Volume Spike RSI Pullback
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Institutional volume spikes often create short-term exhaustion reversals.
 * Price drops on heavy volume signal aggressive selling that tends to mean-revert.
 * When it buys and sells: Buy when price drops >1 ATR on 1.5x avg volume with RSI 30-45 (oversold but not extreme).
 * Sell when RSI crosses above 60 or ATR trailing stop is hit.
 * When it does NOT work: Fails in sustained one-directional drops (e.g. macro bear trends) where volume spikes
 * signal continuation, not exhaustion.
 */
function onUpdate(ctx) {
    const atr = ctx.atr(14);
    if (atr == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;

    // Volume spike: current bar volume > 1.5x 20-bar average
    const volRatio = ctx.vol / avgVol;
    if (volRatio < 1.5) return null;

    // Price drop: current close < open (bearish bar) AND drop > 1 ATR from previous close
    const prevClose = ctx.closes[1];
    if (prevClose == null) return null;

    const priceDrop = prevClose - ctx.price;
    const dropATR = priceDrop / atr;

    // Require meaningful bearish bar on high volume
    if (ctx.price >= ctx.candle.open || dropATR < 1.0) return null;

    // RSI: oversold but not extreme (30-45 range — extreme oversold can keep falling)
    const rsi = ctx.rsi(14);
    if (rsi == null || rsi >= 45 || rsi <= 30) return null;

    // No position — open new long
    if (ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // Position open — manage with ATR trailing stop
    const trail = atr * 2.5;
    const trailStop = ctx.price - trail;

    // Exit if RSI reaches overbought (>60) or price hits ATR trailing stop
    const prevRsi = ctx.rsi(14, 1);
    if (prevRsi != null && rsi > 60 && prevRsi <= 60) {
        return { side: 'sell', qty: ctx.position };
    }

    // ATR trailing stop exit
    if (ctx.entryPx < ctx.price - trail) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
