/*
 * @coinsori-strategy v1
 * name: EMA Crossover + ATR Filter 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Fast EMA crossover catches momentum early. The ATR
 * filter keeps us out when volatility is abnormally low (chop) or
 * abnormally high (panic), letting us enter only when the market is
 * in a healthy trending state.
 * When it buys and sells: Buy when EMA-5 crosses above EMA-13 AND ATR is
 * between 0.5% and 4% of price (not too quiet, not too wild). Sell on
 * the opposite cross or if ATR spikes above 5%.
 * When it does NOT work: In volatile news events ATR spikes and the filter
 * kicks us out — we miss the initial move and re-enter at a worse price.
 */

function onUpdate(ctx) {
    const ema5  = ctx.ema(5);
    const ema13 = ctx.ema(13);
    const atr  = ctx.atr(14);
    if (ema5 == null || ema13 == null || atr == null) return null;

    // ATR as percentage of price — normalises across BTC price levels
    const atrPct = atr / ctx.price;

    // Previous bar values for crossover detection
    const ema5_1  = ctx.ema(5, 1);
    const ema13_1 = ctx.ema(13, 1);
    if (ema5_1 == null || ema13_1 == null) return null;

    // ── ENTRY: EMA-5 crosses above EMA-13, ATR in healthy range ──
    if (ctx.position === 0 &&
        ema13_1 <= ema5_1 && ema5 > ema13 &&
        atrPct >= 0.005 && atrPct <= 0.04) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: opposite cross OR ATR spikes (regime change) ──
    if (ctx.position > 0) {
        if ((ema13_1 >= ema5_1 && ema13 < ema5) || atrPct > 0.05) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
