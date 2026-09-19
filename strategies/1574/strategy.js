/*
 * @coinsori-strategy v1
 * name: bb-rsi-volume-reversion
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * Improved Bollinger Band mean reversion with volume confirmation.
 * The base BB+RSI approach showed +15.7%/+7.5%/+36.8% across 3 walk-forward windows
 * (experiment id 374). This version adds a volume filter: only enter when volume
 * is expanding above its 20-bar average — the mean reversion has fuel behind it.
 * Buys when price ≤ lower BB, RSI < 30, and volume > avgVol(20).
 * Sells when price reaches mid-Band or RSI > 65.
 * When it does NOT work: in strong one-directional trends where price stays below
 * the lower band — mean reversion fails in sustained crashes.
 */
function onUpdate(ctx) {
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Volume confirmation: require expanding volume to filter weak setups
    // avgVol(20) = 20-bar average volume; vol > avg means participation is rising
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volExpanding = ctx.vol > avgVol;

    // === ENTRY: price at lower band + RSI oversold + volume expanding ===
    const priceAtLower = ctx.price <= bb.lower;
    const rsiOversold = rsi < 30;  // tighter than 35 — more selective entry
    if (priceAtLower && rsiOversold && volExpanding && ctx.position <= 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // === EXIT: price at mid-band OR RSI overbought ===
    const priceAtMid = ctx.price >= bb.mid;
    const rsiOverbought = rsi > 65;
    if ((priceAtMid || rsiOverbought) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
