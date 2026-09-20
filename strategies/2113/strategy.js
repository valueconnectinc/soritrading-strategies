/*
 * @coinsori-strategy v1
 * name: Minimal RSI Cross — XRPUSDT 4H Diagnostic
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: 2111 and 2112 both failed to generate trades (2112: 0/3 windows,
 * 2111: 16 trades in W1 but -7.27% vs +191% bench). This is a stripped-down diagnostic
 * to confirm that RSI crossovers fire at all on XRPUSDT 4H. If this also fires 0 times,
 * the problem is deeper (data, indicator calculation, or sizing). If it fires, we know
 * the base signal works and can layer on filters.
 * When it buys and sells: Buy when RSI(14) crosses above 30. Sell when RSI crosses
 * below 70. Fixed fractional 10% per trade. No BB, no ATR sizing, no DXY.
 * When it does NOT work: RSI can stay above 70 for extended periods in XRP pumps,
 * causing the strategy to buy late and sell at a loss. Also whipsaws in chop.
 */
function onUpdate(ctx) {
    const rsi  = ctx.rsi(14);
    const rsi1 = ctx.rsi(14, 1);
    const price = ctx.price;
    if (rsi == null || rsi1 == null) return null;

    const pos = ctx.position;

    // Entry: RSI crosses above 30 (oversold bounce starting)
    if (pos === 0) {
        if (rsi1 < 30 && rsi >= 30) {
            const qty = Math.floor((ctx.cash * 0.10) / price);
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }
    }

    // Exit: RSI crosses below 70 (overbought exhaustion)
    if (pos > 0) {
        if (rsi1 >= 70 && rsi < 70) {
            return { side: 'sell', qty: pos };
        }
        // Hard stop: RSI drops below 40 (aggressive exit)
        if (rsi < 40) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
