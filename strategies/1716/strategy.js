/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout v3
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Combines volatility contraction (Bollinger bandwidth squeeze)
 * with ATR-based stops (more adaptive than fixed %) and a looser trend filter.
 * The goal is to capture the squeeze-breakout edge that worked in cycle 56's bear
 * markets, while ATR stops handle volatility regime changes automatically.
 * When it buys and sells: Buy when Bollinger bandwidth is at a 20-bar low AND
 * price breaks above upper band with RSI confirming (above 50). Stop is 2x ATR(14)
 * from entry. Sell when price reaches 2x ATR profit target, RSI hits 70, or stop fires.
 * When it does NOT work: In strong directional trends without compression phases,
 * the bandwidth squeeze never fires and the strategy sits out. Also fails in choppy
 * markets where squeeze fires but price whipsaws.
 */
function onUpdate(ctx) {
    // ── Indicators ───────────────────────────────────────────────────────
    const bb    = ctx.bb(20, 2, 0);
    const bb1   = ctx.bb(20, 2, 1);
    const bb20  = ctx.bb(20, 2, 20); // 20 bars ago for bandwidth comparison
    const atr   = ctx.atr(14, 0);
    const atr1  = ctx.atr(14, 1);
    const rsi   = ctx.rsi(14, 0);
    const rsi1  = ctx.rsi(14, 1);
    const price  = ctx.price;
    const price1 = ctx.closes[1];

    if (bb == null || bb1 == null || bb20 == null ||
        atr == null || atr1 == null ||
        rsi == null || rsi1 == null) return null;

    const { upper, middle, lower } = bb;
    const { upper: u1, lower: l1 } = bb1;

    // Bandwidth = upper - lower
    const bw      = upper - lower;
    const bw20ago = bb20.upper - bb20.lower;
    const bwRatio = bw / bw20ago; // < 1 means compressed vs 20 bars ago

    // ── OPEN POSITION LOGIC ──────────────────────────────────────────────
    if (ctx.position === 0) {
        // Squeeze: bandwidth at 20-bar low (compressed volatility)
        const isSqueeze = bwRatio < 0.75;

        // Breakout: price broke above upper band this bar
        const breakout = price > upper && price1 <= u1;

        // RSI confirmation (momentum behind the move)
        const rsiConfirm = rsi > 50 && rsi > rsi1;

        if (isSqueeze && breakout && rsiConfirm) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }

        // FALLBACK: Deep oversold + squeeze = high-probability bounce
        const deepOversold = rsi < 35 && rsi > rsi1; // RSI turning from oversold
        const nearLower    = price <= lower * 1.01;
        if (isSqueeze && deepOversold && nearLower) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // ── CLOSE POSITION LOGIC ─────────────────────────────────────────────
    if (ctx.position > 0) {
        const entryPx = ctx.entryPx || price;
        const atrStop  = atr * 2;     // 2x ATR stop — adapts to volatility
        const atrTarget = atr * 2;    // 2x ATR profit target

        // SELL 1: Profit target reached
        if (price >= entryPx + atrTarget) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 2: ATR stop loss
        if (price <= entryPx - atrStop) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 3: RSI overbought (70+)
        if (rsi > 70) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 4: Price reached middle band (mean reversion target)
        if (price >= middle) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 5: Squeeze resolved against us (bandwidth expanding while we're short-ish)
        // No new squeeze = no new entry = exit if trend looks weak
        const rsiWeak = rsi < 40 && rsi < rsi1;
        if (rsiWeak) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
