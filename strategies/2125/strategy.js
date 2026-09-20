/*
 * @coinsori-strategy v1
 * name: Ichimoku Cloud Trend on SOLUSDT 4h
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Ichimoku Cloud is a complete multi-component system (5 lines, 2 cloud boundaries)
 * that embeds regime detection directly — cloud thickness signals trend strength, Tenkan-Kijun cross
 * gives momentum, Chikou span provides lagging confirmation. It is a genuinely different signal family
 * from every strategy tested so far on SOLUSDT (EMA crossovers, MACD, ATR regime, Donchian all failed).
 * When it buys and sells: Buy when price is above the cloud (both spans), Tenkan crosses above Kijun,
 * and Chikou confirms (close 26 bars ago above price 26 bars ago). Sell on the reverse.
 * When it does NOT work: In very short choppy ranges where the cloud flips frequently, the 26-bar
 * Kijun and 52-bar Span B are too slow — the strategy enters late and exits into the next reversal.
 */

function onUpdate(ctx) {
    // ---- Helper: highest high over N bars ending at ago ----
    function highestHigh(n, ago) {
        let mx = -Infinity;
        for (let i = ago; i < ago + n; i++) {
            const h = ctx.high(n, i);
            if (h == null) return null;
            if (h > mx) mx = h;
        }
        return mx;
    }

    // ---- Helper: lowest low over N bars ending at ago ----
    function lowestLow(n, ago) {
        let mn = Infinity;
        for (let i = ago; i < ago + n; i++) {
            const l = ctx.low(n, i);
            if (l == null) return null;
            if (l < mn) mn = l;
        }
        return mn;
    }

    // ---- Ichimoku components (ago = 0 = current forming bar) ----
    const hh9  = highestHigh(9, 0);
    const ll9  = lowestLow(9, 0);
    const hh26 = highestHigh(26, 0);
    const ll26 = lowestLow(26, 0);
    const hh52 = highestHigh(52, 0);
    const ll52 = lowestLow(52, 0);
    if (hh9 == null || ll9 == null || hh26 == null || ll26 == null || hh52 == null || ll52 == null) return null;

    const tenkan = (hh9 + ll9) / 2;
    const kijun  = (hh26 + ll26) / 2;
    const spanA  = (tenkan + kijun) / 2;
    const spanB  = (hh52 + ll52) / 2;

    // ---- Chikou: close 26 bars ago vs price 26 bars ago ----
    const chikouClose = ctx.price; // price at ago=0 is current price; ctx.price IS close at current bar
    // We need close from 26 bars ago — use ctx.closes[26] or ctx.closes[26] from ago=26
    // ctx.closes is the array of recent closes; ctx.price is current close
    // Chikou span: current close plotted 26 bars back
    // At bar i, Chikou = close at bar i (plotted at bar i+26)
    // At current bar, Chikou value = current close, and we compare it to the price 26 bars ago
    // The "price 26 bars ago" is ctx.closes[26] (index 26 from current)
    const closes = ctx.closes;
    const chikouValue   = ctx.price;                          // current close
    const price26Ago    = closes && closes.length > 26 ? closes[26] : null; // close 26 bars ago

    // ---- Previous bar components (for cross detection) ----
    const hh9p  = highestHigh(9, 1);
    const ll9p  = lowestLow(9, 1);
    const hh26p = highestHigh(26, 1);
    const ll26p = lowestLow(26, 1);
    const hh52p = highestHigh(52, 1);
    const ll52p = lowestLow(52, 1);
    if (hh9p == null || ll9p == null || hh26p == null || ll26p == null || hh52p == null || ll52p == null) return null;

    const tenkanP = (hh9p + ll9p) / 2;
    const kijunP  = (hh26p + ll26p) / 2;

    // ---- Tenkan-Kijun cross detection ----
    const bullCross = tenkanP <= kijunP && tenkan > kijun;
    const bearCross = tenkanP >= kijunP && tenkan < kijun;

    // ---- Cloud direction (bullish = spanA > spanB, price above both) ----
    const cloudBull = spanA > spanB && ctx.price > spanA && ctx.price > spanB;
    const cloudBear = spanA < spanB && ctx.price < spanA && ctx.price < spanB;

    // ---- Chikou confirmation ----
    // Chikou bullish: current close > price 26 bars ago
    // Chikou bearish: current close < price 26 bars ago
    const chikouBull = price26Ago != null && chikouValue > price26Ago;
    const chikouBear = price26Ago != null && chikouValue < price26Ago;

    // ---- ATR for stops ----
    const atr = ctx.atr(14);
    const atrPrev = ctx.atr(14, 1);
    if (atr == null || atrPrev == null) return null;

    // ---- RSI for exits ----
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // ---- State for trailing ATR stop ----
    const state = ctx.state;
    const hasPos = ctx.position > 0;

    // ---- ENTRY ----
    if (!hasPos) {
        // BUY: bullish cloud + Tenkan/Kijun cross up + Chikou confirm
        if (cloudBull && bullCross && chikouBull) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
        }
        // SELL: bearish cloud + Tenkan/Kijun cross down + Chikou confirm
        if (cloudBear && bearCross && chikouBear) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.98 };
        }
    }

    // ---- EXIT ----
    if (hasPos) {
        // Long exit conditions
        if (ctx.position > 0) {
            // Exit 1: RSI overbought
            if (rsi > 70) return { side: 'sell', qty: ctx.position };
            // Exit 2: Bearish cross
            if (bearCross) return { side: 'sell', qty: ctx.position };
            // Exit 3: Price exits cloud (drops below cloud)
            if (ctx.price < spanA && ctx.price < spanB) return { side: 'sell', qty: ctx.position };
        }
        // Short exit conditions
        if (ctx.position < 0) {
            // Exit 1: RSI oversold
            if (rsi < 30) return { side: 'buy', qty: Math.abs(ctx.position) };
            // Exit 2: Bullish cross
            if (bullCross) return { side: 'buy', qty: Math.abs(ctx.position) };
            // Exit 3: Price exits cloud (rises above cloud)
            if (ctx.price > spanA && ctx.price > spanB) return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
