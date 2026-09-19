/*
 * @coinsori-strategy v1
 * name: EMA200 Regime RSI Dual Direction
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * A regime-aware strategy that trades BOTH directions.
 * In bull mode (price > EMA200): buy when RSI drops into oversold (mean-reversion long).
 * In bear mode (price < EMA200): sell when RSI climbs into overbought (mean-reversion short).
 * The regime filter prevents the previous strategy's fatal flaw — going short in a bull market.
 *
 * When it buys and sells:
 *   Bull mode (price above EMA200): enter long on RSI oversold (< 35), exit when RSI > 60 or after 48h.
 *   Bear mode (price below EMA200): enter short on RSI overbought (> 65), exit when RSI < 40 or after 48h.
 *   Never hold through a regime flip — close position when price crosses EMA200.
 *
 * When it does NOT work:
 *   Ranging markets with no clear trend cause whipsaws in both directions.
 *   Very short holding periods (4h candles) mean funding fees on perpetuals are a headwind.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const ema   = ctx.ema(200);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (ema == null || rsi == null) return null;   // warm-up guard

    // ── Regime: bull = price above EMA, bear = price below EMA ───────────────
    const bull = price > ema;

    // ── Position state ──────────────────────────────────────────────────────
    const pos  = ctx.position;   // > 0 = long, < 0 = short
    const open = ctx.openOrders();

    // ── Time-based exit guard (max hold ~48h = 12 bars) ────────────────────
    const entryBar = (pos !== 0 && ctx.entryPx != null) ? ctx.entryPx.bar : null;
    const barsSinceEntry = (entryBar != null) ? (ctx.i - entryBar) : 999;
    const timeExit = barsSinceEntry >= 12;

    // ── Regime-flip exit: close if price crosses EMA ────────────────────────
    const prevPrice = ctx.closes[1];
    if (pos > 0 && !bull && prevPrice > ema) return { side: 'sell', qty: pos };   // flipped to bear, close long
    if (pos < 0 &&  bull && prevPrice < ema) return { side: 'buy',  qty: Math.abs(pos) }; // flipped to bull, close short

    // ── Time / RSI exit ──────────────────────────────────────────────────────
    if (pos > 0 && (timeExit || rsi > 60)) return { side: 'sell', qty: pos };     // close long
    if (pos < 0 && (timeExit || rsi < 40)) return { side: 'buy',  qty: Math.abs(pos) }; // close short

    // ── Entry: only if flat ──────────────────────────────────────────────────
    if (pos !== 0 || open.length > 0) return null;

    // ── Bull mode: long on RSI oversold ──────────────────────────────────────
    if (bull && rsi < 35) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Bear mode: short on RSI overbought ───────────────────────────────────
    if (!bull && rsi > 65) {
        return { side: 'sell', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
