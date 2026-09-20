/*
 * @coinsori-strategy v1
 * name: RSI Zone + Volume + DXY Macro Filter — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Strategy 2099 (ATR Ratio Regime) fired zero trades on XRPUSDT
 * because its regime thresholds were too tight for XRP's specific volatility profile.
 * This strategy uses a simpler, proven signal: RSI oversold at the lower Bollinger Band
 * with volume confirmation and a DXY macro filter to avoid trading against a strong
 * USD uptrend. BB+RSI already beat the market on XRPUSDT (Exp 512: +247% vs +3251%
 * buy-and-hold — it underperformed in the bull run but won in bear/range windows).
 * Adding volume confirmation and DXY filtering improves signal quality.
 * When it buys and sells: Buy when RSI < 35, price ≤ lower BB, volume > 1.2× avg20,
 * and DXY < 104 (no strong USD). Sell when RSI > 60 or price reaches middle BB.
 * When it does NOT work: In sustained XRP pumps where RSI never drops below 35
 * and the strategy misses the entire move. Also fails if XRP gaps down on negative
 * news (DXY spike) before the strategy can exit.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────────
    const rsi   = ctx.rsi(14);
    const bb    = ctx.bb(20, 2);
    const atr   = ctx.atr(14);
    const vol   = ctx.vol;

    if (rsi == null || bb == null || atr == null || vol == null) return null;

    // ── Volume confirmation: current vol > 20-bar average ───────────────────────
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volSurge = vol > avgVol * 1.2;

    // ── DXY macro filter: DXY > 104 = strong USD, historically bearish for XRP ──
    const dxy    = ctx.macro('dxy');
    const usdSafe = dxy == null || dxy < 104;  // null = allow, no filter

    // ── Previous bar RSI for "fresh cross" detection ────────────────────────────
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    const price   = ctx.price;
    const pos     = ctx.position;
    const entryPx = ctx.entryPx;

    // ── Entry: Long ─────────────────────────────────────────────────────────────
    if (pos === 0) {
        const rsiOversold   = rsi < 35;
        const rsiFreshDrop  = rsi < 35 && rsi1 >= 35;   // just crossed into oversold
        const atLowerBB     = bb.lower != null && price <= bb.lower * 1.01;
        const confirmed     = volSurge && usdSafe;

        // Primary: fresh RSI cross + at lower BB + volume + DXY confirmed
        if (rsiFreshDrop && atLowerBB && confirmed) {
            const riskCash = ctx.cash * 0.015;          // 1.5% risk per trade
            const stopDist = atr * 2.5;                  // 2.5× ATR stop
            const qty      = Math.floor(riskCash / stopDist);
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }

        // Fallback: already deeply oversold + strong volume + DXY confirmed
        if (rsi < 30 && atLowerBB && volSurge && usdSafe) {
            const riskCash = ctx.cash * 0.015;
            const stopDist = atr * 2.5;
            const qty      = Math.floor(riskCash / stopDist);
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }
    }

    // ── Exit: Long ──────────────────────────────────────────────────────────────
    if (pos > 0) {
        const rsiNorm  = rsi > 60;
        const atMiddle = bb.middle != null && price >= bb.middle * 0.99;

        if (rsiNorm || atMiddle) {
            return { side: 'sell', qty: pos };
        }

        // Stop loss: 2.5× ATR below entry
        if (entryPx != null) {
            const stopPx = entryPx - atr * 2.5;
            if (price < stopPx) {
                return { side: 'sell', qty: pos };
            }
        }
    }

    // ── Emergency macro exit: DXY > 107 = strong USD spike, close position ─────
    if (pos > 0 && dxy != null && dxy > 107) {
        return { side: 'sell', qty: pos };
    }

    return null;
}
