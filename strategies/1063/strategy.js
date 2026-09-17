/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout 4H v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Captures large directional moves when BTC closes above the prior bar's high
 * with ATR confirming genuine volatility, and RSI filtering out weak momentum.
 * Buys on close above prior bar high with RSI > 50 and ATR expanding.
 * Sells on close below prior bar low or RSI dropping below 40.
 * Struggles in low-volatility choppy markets where breakouts fail quickly.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────
    const atr  = ctx.atr(14);
    const rsi  = ctx.rsi(14);
    const prevAtr = ctx.atr(14, 1);   // ATR of prior bar to detect expansion
    if (atr == null || rsi == null || prevAtr == null) return null;

    // ── Prior bar data (ago=1 = last closed bar) ─────────────
    const prevClose = ctx.closes[1];   // prior bar close
    const prevHigh  = ctx.high(1);
    const prevLow   = ctx.low(1);
    if (prevClose == null || prevHigh == null || prevLow == null) return null;

    const hasPosition = ctx.position > 0;

    // ── Entry: close above prior bar high (confirmed breakout by close)
    // Require ATR expanding (current > prior) to confirm genuine volatility
    // Require RSI > 50 to avoid buying into weakness
    const breakout = prevClose > prevHigh;
    const atrExpanding = atr > prevAtr;

    if (!hasPosition && breakout && atrExpanding && rsi > 50 && rsi < 80) {
        // Risk 1 % of cash per trade
        const riskAmt = ctx.cash * 0.01;
        const qty     = riskAmt / atr;
        return { side: 'buy', qty: qty };
    }

    // ── Exit conditions ─────────────────────────────────────
    if (hasPosition) {
        // Stop 1: close falls below prior bar low
        const currClose = ctx.closes[0];
        if (currClose != null && currClose < prevLow) {
            return { side: 'sell', qty: ctx.position };
        }

        // Stop 2: RSI momentum fades below 40
        if (rsi < 40) {
            return { side: 'sell', qty: ctx.position };
        }

        // Take-profit: RSI reaches overbought zone
        if (rsi > 80) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
