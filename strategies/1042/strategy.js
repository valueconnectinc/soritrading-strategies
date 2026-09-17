/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion + ADX Trend Filter Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Mean-reversion strategy on daily BTCUSDT with a manually-computed ADX(14) trend
 * filter to avoid trading against strong trends. Buys when price touches the lower
 * Bollinger Band AND RSI is oversold (< 35) AND ADX < 25 (not a strong trend) AND
 * price is above the 200-day EMA. Sells when price reaches the upper band OR RSI
 * climbs above 65.
 *
 * When it buys and sells: Buy at lower BB touch with RSI confirm + dual trend filter;
 * sell at upper BB touch or overbought RSI. Holds until signal reverses.
 *
 * When it does NOT work: Strong sustained trends (BTC keeps falling after touching
 * lower BB). Works best in range-bound chop and mild trends.
 */
function onUpdate(ctx) {
    // ── Warmup: need 200 bars for EMA200, 20 for BB, 14 for RSI/ATR ──
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const price  = ctx.price;
    const lower  = bb.lower;
    const upper  = bb.upper;
    const mid    = bb.mid;

    const inPos  = ctx.position > 0;
    const noPos  = ctx.position <= 0;

    // ── Trend filter: ADX(14) manually from closes/highs/lows ──
    // ADX > 25 = strong trend in either direction → skip mean-reversion entries
    const adx = calcADX(ctx);
    const adxOk = adx != null && adx < 25;

    // 200 EMA: skip BUY when price is below EMA (no catch-the-falling-knife)
    const ema200 = ctx.ema(200);
    const emaOk = ema200 != null && price > ema200;

    // ── BUY: lower BB + RSI oversold + both trend filters pass ──
    if (noPos && price <= lower && rsi < 35 && adxOk && emaOk) {
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price,
            postOnly: false
        };
    }

    // ── SELL: upper BB OR RSI overbought (> 65) ──
    if (inPos && (price >= upper || rsi > 65)) {
        return { side: 'sell', qty: ctx.position };
    }

    // ── TRAILING STOP: if mid BB rises > 20% above entry, take profit ──
    if (inPos && mid > ctx.entryPx * 1.20) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}

// ── Manual ADX(14) using Wilder smoothing ──────────────────────────────────────
// Uses ctx.closes array for close prices, ctx.high(1,ago)/ctx.low(1,ago) for bars.
// ago=1 = previous bar (closed, safe in backtest and live), ago=2..15 = older bars.
function calcADX(ctx) {
    const P = 14; // ADX period
    const N = P * 2; // need 28 bars total for stable initial sum

    const closes = ctx.closes;
    if (closes == null || closes.length < N + 1) return null;

    // Helper: high/low at ago N using ctx.high(1,ago) / ctx.low(1,ago)
    function barHigh(ago) { return ctx.high(1, ago); }
    function barLow(ago)  { return ctx.low(1, ago);  }
    function barClose(ago){ return closes[ago]; }

    // True Range for bar at 'ago' (ago 1 = previous bar)
    function trueRange(ago) {
        const h = barHigh(ago), l = barLow(ago), pc = barClose(ago + 1);
        if (h == null || l == null || pc == null) return null;
        return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    // +DM / -DM for bar at 'ago'
    function dirMove(ago) {
        const h  = barHigh(ago),  l  = barLow(ago);
        const ph = barHigh(ago+1), pl = barLow(ago+1);
        if (h == null || l == null || ph == null || pl == null) return null;
        const upDM = h - ph;
        const dnDM = pl - l;
        const posDM = (upDM > dnDM && upDM > 0) ? upDM : 0;
        const negDM = (dnDM > upDM && dnDM > 0) ? dnDM : 0;
        return { pos: posDM, neg: negDM };
    }

    // ── Sum TR, +DM, -DM over the last P closed bars (ago = P..1) ──
    let sumTR = 0, sumPDM = 0, sumNDM = 0;
    for (let ago = P; ago >= 1; ago--) {
        const tr = trueRange(ago);
        const dm = dirMove(ago);
        if (tr == null || dm == null) return null;
        sumTR  += tr;
        sumPDM += dm.pos;
        sumNDM += dm.neg;
    }

    if (sumTR === 0) return null;

    // ── Wilder initial smoothed values ──
    let atr = sumTR  / P;
    let pdm = sumPDM / P;
    let ndm = sumNDM / P;

    // ── Wilder update for the current (forming) bar using prev close ──
    const curH = ctx.high(1, 1);
    const curL = ctx.low(1, 1);
    const prevC = barClose(1);
    if (curH == null || curL == null || prevC == null) return null;

    const curTR  = Math.max(curH - curL, Math.abs(curH - prevC), Math.abs(curL - prevC));
    const curUp  = curH - barHigh(2);
    const curDn  = barLow(2) - curL;
    const curPDM = (curUp > curDn && curUp > 0) ? curUp : 0;
    const curNDM = (curDn > curUp && curDn > 0) ? curDn : 0;

    // Wilder update: (prev × (P-1) + current) / P
    atr = (atr * (P - 1) + curTR)  / P;
    pdm = (pdm * (P - 1) + curPDM) / P;
    ndm = (ndm * (P - 1) + curNDM) / P;

    if (atr === 0) return null;

    // ── DI and DX ──
    const di14  = (pdm / atr) * 100;
    const diNeg = (ndm / atr) * 100;
    const sumDI = di14 + diNeg;
    if (sumDI === 0) return null;

    const dx = Math.abs(di14 - diNeg) / sumDI * 100;
    return dx; // this is the current ADX value (simplified single-step smoothing)
}
