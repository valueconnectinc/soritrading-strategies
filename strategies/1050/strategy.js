/*
 * @coinsori-strategy v1
 * name: RSI-2 Tight Thresholds Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * RSI(2) mean reversion with TIGHTER thresholds (15/85 vs 20/70).
 * RSI(2) < 15 = even more oversold = higher probability bounce.
 * RSI(2) > 85 = even more overbought = safer exit.
 * Keeps the EMA200 trend filter and 12-day timeout from the original.
 *
 * When it buys and sells: Buy at RSI(2) < 15 with price above EMA200;
 * sell at RSI(2) > 85 or upper BB touch. Holds 1-10 days typically.
 *
 * When it does NOT work: In strong sustained drops — even RSI(2) < 15
 * can get whipsawed if BTC gaps down hard. Fewer signals than 20/70 but
 * each signal should have higher conviction.
 */
function onUpdate(ctx) {
    const rsi2 = ctx.rsi(2);
    if (rsi2 == null) return null;

    const ema200 = ctx.ema(200);
    if (ema200 == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const price  = ctx.price;
    const upper  = bb.upper;
    const inPos  = ctx.position > 0;
    const noPos  = ctx.position <= 0;

    // BUY: RSI(2) < 15 (deeper oversold than original 20) + price above EMA200
    if (noPos && rsi2 < 15 && price > ema200) {
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price
        };
    }

    // SELL: RSI(2) > 85 (deeper overbought than original 70) OR upper BB touched
    if (inPos && (rsi2 > 85 || price >= upper)) {
        return { side: 'sell', qty: ctx.position };
    }

    // TIME STOP: 12-day max hold (same as original)
    const s = ctx.state;
    if (inPos) {
        s.barsHeld = (s.barsHeld || 0) + 1;
        if (s.barsHeld > 12) {
            s.barsHeld = 0;
            return { side: 'sell', qty: ctx.position };
        }
    } else {
        s.barsHeld = 0;
    }

    return null;
}
