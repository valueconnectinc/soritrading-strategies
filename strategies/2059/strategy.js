/*
 * @coinsori-strategy v1
 * name: ATR Regime-Adaptive Mean Reversion — BNBUSDT
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same ATR ratio regime-adaptive logic that worked on ETHUSDT (exp 504)
 * applied to BNBUSDT — testing whether the signal family generalizes across major assets.
 * When it buys and sells: In CHOP (ATR ratio < 0.65): buys when RSI < 30 and price
 * touches BB lower band. In TREND (ATR ratio > 0.95): buys on EMA 9/21 golden cross.
 * Exits on opposite signal or 4% stop-loss / 12% take-profit.
 * When it does NOT work: In fast flash-crash drops the stop-loss triggers before mean
 * reversion can work. Fails in the neutral ATR zone (0.65-0.95).
 */
function onUpdate(ctx) {
    const price  = ctx.price;
    const rsi   = ctx.rsi(14, 1);
    const bb    = ctx.bb(20, 2, 1);
    const ema9  = ctx.ema(9, 1);
    const ema21 = ctx.ema(21, 1);
    const ema50 = ctx.ema(50, 1);
    const atr   = ctx.atr(14, 1);
    const atrS  = ctx.atr(50, 1);

    if (rsi == null || bb == null || bb.lower == null || ema9 == null || ema21 == null || atr == null || atrS == null) return null;

    // ATR fast/slow ratio: < 0.65 = choppy, > 0.95 = trending
    const atrRatio = atr / atrS;
    const isChop  = atrRatio < 0.65;
    const isTrend = atrRatio > 0.95;

    // ── CHOP MODE: Mean Reversion ──────────────────────────────────────────
    if (isChop) {
        const bbLower = bb.lower;
        const bbMid   = bb.mid;
        const atLower = price <= bbLower * 1.02;

        if (ctx.position <= 0 && rsi < 30 && atLower) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        if (ctx.position > 0 && (rsi > 60 || price >= bbMid * 0.98)) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── TREND MODE: EMA Crossover Momentum ─────────────────────────────────
    if (isTrend) {
        const ema9Prev  = ctx.ema(9, 2);
        const ema21Prev = ctx.ema(21, 2);
        const ema50Prev = ctx.ema(50, 2);
        const pricePrev = ctx.closes[1];

        if (ema9Prev != null && ema21Prev != null && ema50Prev != null && pricePrev != null) {
            const goldenCross = ema9Prev <= ema21Prev && ema9 > ema21;
            const aboveEma50  = price > ema50 && pricePrev <= ema50Prev;

            if (ctx.position <= 0 && goldenCross && aboveEma50) {
                return { side: 'buy', qty: ctx.cash / price * 0.99 };
            }

            const deathCross = ema9Prev >= ema21Prev && ema9 < ema21;
            if (ctx.position > 0 && (deathCross || price < ema50 * 0.97)) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    // ── Universal stop-loss: 4% from entry ─────────────────────────────────
    if (ctx.position > 0 && ctx.entryPx != null) {
        const pnlPct = (price - ctx.entryPx) / ctx.entryPx;
        if (pnlPct < -0.04) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── Universal take-profit: 12% from entry ────────────────────────────────
    if (ctx.position > 0 && ctx.entryPx != null) {
        const pnlPct = (price - ctx.entryPx) / ctx.entryPx;
        if (pnlPct > 0.12) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
