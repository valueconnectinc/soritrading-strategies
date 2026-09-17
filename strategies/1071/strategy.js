/*
 * @coinsori-strategy v1
 * name: SMA-20 Trend RSI Pullback Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: SMA-20 on daily bars captures the 3-4 week trend with
 * minimal lag. RSI pullback entries buy the dip in an uptrend rather than
 * chasing breakouts — lower win rate but better risk/reward.
 *
 * When it buys and sells: Buy when price is above SMA-20 and RSI pulls back
 * to 40 (not oversold, just cooling). Sell when RSI crosses below 50 or price
 * closes below SMA-20 or 5% stop-loss hits.
 *
 * When it does NOT work: In choppy markets where price oscillates around SMA-20
 * — the trend flips and stop-losses get hit repeatedly. Also fails in strong
 * bear trends where RSI stays compressed below 40.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const sma20 = ctx.sma(20);
    const rsi  = ctx.rsi(14);
    const price = ctx.price;

    // Warm-up guard: SMA-20 needs 20 bars
    if (sma20 == null || rsi == null) return null;

    const hasPos = ctx.position > 0;

    // ── Previous-bar values ───────────────────────────────────────────────
    const sma20_1 = ctx.sma(20, 1);
    const rsi_1   = ctx.rsi(14, 1);
    const rsi_2   = ctx.rsi(14, 2);
    if (sma20_1 == null || rsi_1 == null || rsi_2 == null) return null;

    // ── Entry: trend up + RSI pullback cooling ───────────────────────────
    // Price above SMA-20 = short-term uptrend
    const trendUp = price > sma20;

    // RSI pulled back to 40 zone (cooled off, not dead)
    const rsiPullback = rsi > 35 && rsi < 50;

    // RSI just bounced from the pullback zone (crossed above 40)
    const rsiBounce = rsi_2 < 40 && rsi_1 >= 40 && rsi >= 40;

    // No position + all conditions met
    if (!hasPos && trendUp && rsiPullback && rsiBounce) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // ── Exit conditions ───────────────────────────────────────────────────
    // RSI crosses below 50: momentum weakening
    const rsiWeak = rsi_2 >= 50 && rsi_1 < 50;

    // Trend broken: price closes below SMA-20
    const trendBroken = price < sma20;

    // 5% hard stop-loss
    const stopHit = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.05;

    if (hasPos && (rsiWeak || trendBroken || stopHit)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
