/*
 * @coinsori-strategy v1
 * name: Squeeze Trend Hybrid
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Combines volatility squeeze (best performer in cycle 56 bear
 * markets) with an EMA trend filter to avoid buying in downtrends. When the trend
 * is up AND a squeeze fires, the breakout is higher-probability. When trend is down,
 * the squeeze signal is skipped entirely — avoiding the main failure mode of pure
 * squeeze strategies in strong downtrends.
 * When it buys and sells: Buy when EMA(21) is rising (trend up) AND Bollinger
 * bandwidth hits a 20-bar low (squeeze) AND price breaks above upper band. Sell
 * when price reaches middle band or EMA(21) flips down.
 * When it does NOT work: In strong trends the bandwidth squeeze never fires, so this
 * misses early entries. Also fails in pure chop where squeeze fires but trend never
 * confirms.
 */
function onUpdate(ctx) {
    // ── Indicators ───────────────────────────────────────────────────────
    const bb    = ctx.bb(20, 2, 0);
    const bb1   = ctx.bb(20, 2, 1);
    const bb20  = ctx.bb(20, 2, 20); // bandwidth 20 bars ago for squeeze comparison
    const ema21 = ctx.ema(21, 0);
    const ema21_1 = ctx.ema(21, 1);
    const ema21_2 = ctx.ema(21, 2);
    const rsi   = ctx.rsi(14, 0);
    const rsi1  = ctx.rsi(14, 1);
    const price  = ctx.price;
    const price1 = ctx.closes[1];

    if (bb == null || bb1 == null || bb20 == null ||
        ema21 == null || ema21_1 == null || ema21_2 == null ||
        rsi == null || rsi1 == null) return null;

    const { upper, middle, lower } = bb;
    const { upper: u1, lower: l1 } = bb1;

    // Bandwidth = upper - lower (volatility measure)
    const bw     = upper - lower;
    const bw20ago = bb20.upper - bb20.lower;

    // ── Trend filter ─────────────────────────────────────────────────────
    // Trend is UP when EMA21 is rising (cur > prev > 2 ago)
    const trendUp = ema21 > ema21_1 && ema21_1 > ema21_2;

    // ── Squeeze detection ─────────────────────────────────────────────────
    // Bandwidth at 20-bar low means volatility is compressed = squeeze
    const isSqueeze = bw < bw20ago * 0.7; // current bandwidth < 70% of 20-bar ago

    // ── OPEN POSITION LOGIC ──────────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: trend up + squeeze firing + breakout above upper band
        const breakout = price > upper && price1 <= u1; // price broke above upper band
        const rsiConfirm = rsi > 50;

        if (trendUp && isSqueeze && breakout && rsiConfirm) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }

        // FALLBACK: Strong trend pullback — trend up, price at/above EMA21, RSI < 50
        // (buying the dip in an uptrend)
        const pullback = trendUp && rsi < 50 && rsi > rsi1 && price > ema21;
        const nearBand  = price >= lower && price <= middle;
        if (pullback && nearBand) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // ── CLOSE POSITION LOGIC ─────────────────────────────────────────────
    if (ctx.position > 0) {
        // SELL 1: Price reached middle band
        if (price >= middle) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 2: Trend flipped — EMA21 no longer rising
        const trendFlipped = !(ema21 > ema21_1 && ema21_1 > ema21_2);
        if (trendFlipped && price > ema21) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 3: RSI overbought (70+)
        if (rsi > 70) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 4: Stop loss — 8% from entry (wider than pure squeeze to avoid
        // being stopped out by normal 4h volatility)
        const entryPx = ctx.entryPx || price;
        if (price < entryPx * 0.92) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
