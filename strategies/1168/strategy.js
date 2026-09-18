/*
 * @coinsori-strategy v1
 * name: RSI+BB Oversold Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Combines RSI oversold with Bollinger Band confirmation for entry.
 * Pure RSI oversold (diagnostic) fired 5 trades but lost -10.4% in a bull
 * market. Adding BB context: only buy when price is AT or BELOW the lower
 * BB band (genuine volatility expansion, not just RSI noise).
 * RSI crossing above 30 while at the lower band = more confident signal.
 *
 * When it buys:  RSI crosses above 30 AND price <= lower BB band.
 * When it sells: RSI crosses above 60 OR ATR trail (2.5× ATR from peak)
 *                OR price crosses below lower BB band (volatility collapse)
 *                OR hard 15% stop.
 *
 * When it does NOT work: in strong bear trends BB lower band keeps getting
 * hit and RSI keeps failing. In low-vol chop markets BB bands compress
 * and signals are rare.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14, 0);
    const atr = ctx.atr(14, 0);
    if (rsi == null || atr == null) return null;

    // Bollinger Bands: 20-period, 2 standard deviations
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    const rsi1   = ctx.rsi(14, 1);
    const closes1 = ctx.closes[1];
    if (rsi1 == null || closes1 == null) return null;

    // Entry: RSI crossed INTO oversold (from above 30 to ≤ 30)
    // AND price is at or below the lower BB band (true volatility extremes)
    const rsiCrossUpFromOversold = rsi1 > 30 && rsi <= 30;
    const atLowerBand = ctx.price <= bb.lower;

    // ── No position ─────────────────────────────────────────────────────────
    if (ctx.position === 0) {
        if (rsiCrossUpFromOversold && atLowerBand) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
        }
        return null;
    }

    // ── Active long ─────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: RSI crossed above 60 (overbought)
        const rsiCrossUp = rsi1 < 60 && rsi >= 60;
        if (rsiCrossUp) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 2: Price crossed below lower BB band (volatility breakdown)
        const bb1 = ctx.bb(20, 2, 1);
        if (bb1 != null) {
            const belowBandNow  = ctx.price < bb.lower;
            const belowBandPrev = closes1 >= bb1.lower;
            if (belowBandNow && belowBandPrev) {
                return { side: 'sell', qty: ctx.position };
            }
        }

        // Exit 3: ATR trail stop
        if (ctx.price < ctx.entryPx - 2.5 * atr) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 4: Hard 15% stop
        const ret = (ctx.price - ctx.entryPx) / ctx.entryPx;
        if (ret < -0.15) {
            return { side: 'sell', qty: ctx.position };
        }

        return null;
    }

    return null;
}
