/*
 * @coinsori-strategy v1
 * name: MACD Momentum + RSI Filter
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: MACD captures trend momentum while RSI filters out
 * overbought entries. BNBUSDT has shown sensitivity to oscillator signals
 * in prior 1H tests (Exp 152 RSI mean-reversion +37%, Exp 153 MACD +25%).
 * 4H timeframe gives cleaner signals than 1H.
 * When it buys and sells: Buy when MACD crosses above signal line with RSI
 * in neutral zone (not overbought). Sell when MACD crosses below signal or
 * RSI reaches overbought threshold.
 * When it does NOT work: Fails in choppy, range-bound markets with no clear
 * trend — MACD whipsaws and generates false signals.
 */
function onUpdate(ctx) {
    const macdFast = 12, macdSlow = 26, macdSig = 9;
    const rsiN = 14;
    const rsiBuyMax = 65;   // only buy when RSI is not overbought
    const rsiSellMin = 40;  // sell if RSI drops below this (momentum weakening)
    const atrN = 14;
    const atrMult = 1.5;    // volatility filter: skip if ATR too wide

    // MACD on previous closed bar for reliable signal
    const prevMacd = ctx.macd(macdFast, macdSlow, macdSig, 2);
    const currMacd = ctx.macd(macdFast, macdSlow, macdSig, 1);
    const prevSignal = prevMacd ? prevMacd.signal : null;
    const currSignal = currMacd ? currMacd.signal : null;

    const prevRsi = ctx.rsi(rsiN, 2);
    const currRsi = ctx.rsi(rsiN, 1);
    const prevAtr = ctx.atr(atrN, 1);

    if (prevMacd == null || currMacd == null) return null;
    if (prevSignal == null || currSignal == null) return null;
    if (prevRsi == null || currRsi == null) return null;
    if (prevAtr == null) return null;

    // Volatility filter: skip if ATR is too wide relative to price (high vol regime)
    const atrRatio = prevAtr / ctx.price;
    if (atrRatio > 0.05) return null; // skip if ATR > 5% of price

    const inPosition = ctx.position > 0;

    // BUY: MACD crosses above signal line, RSI in neutral zone
    const bullishCross = prevMacd.macd <= prevSignal && currMacd.macd > currSignal;
    const rsiNeutral = currRsi < rsiBuyMax && currRsi > 30;

    if (!inPosition && bullishCross && rsiNeutral) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: MACD crosses below signal line OR RSI drops below threshold
    const bearishCross = prevMacd.macd >= prevSignal && currMacd.macd < currSignal;
    const rsiWeak = currRsi < rsiSellMin;

    if (inPosition && (bearishCross || rsiWeak)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
