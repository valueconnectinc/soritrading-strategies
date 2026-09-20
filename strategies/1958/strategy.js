/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion + ATR Stop (No BB)
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: RSI oversold bounces are a well-known mean-reversion edge on
 * crypto alts. BNB has distinct pump-dump cycles that make it ideal for this.
 * We deliberately skip Bollinger Bands (Exp 411 already proved BB+RSI works on AVAX)
 * to test whether RSI alone generalizes, and add an ATR stop to manage risk.
 * When it buys and sells: Buy when RSI < 35 and volatility is not too low
 * (ATR > 0.5% of price — avoids ranging chop). Sell when RSI > 55 (not overbought,
 * just "neutralizing") or when price drops 2× ATR below entry.
 * When it does NOT work: In strong downtrends RSI stays oversold for extended periods —
 * the strategy accumulates losing trades before a bounce finally comes.
 */

function onUpdate(ctx) {
  const rsi  = ctx.rsi(14, 1);   // closed bar RSI for stability
  const atr  = ctx.atr(14, 1);   // closed bar ATR for stop
  const ema20 = ctx.ema(20, 1);  // trend context (closed bar)

  if (rsi == null || atr == null || ema20 == null) return null;

  const price    = ctx.price;
  const position = ctx.position;
  const entryPx  = ctx.entryPx;

  // ── ATR filter: skip low-vol chop ────────────────────────────────────────────
  // ATR expressed as % of price; below 0.4% = very quiet, prone to whipsaw
  const atrPct = atr / price;
  if (atrPct < 0.004) return null;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (position === 0) {
    // RSI oversold + price above EMA20 (not in strong downtrend)
    if (rsi < 35 && price > ema20) {
      const qty = ctx.cash / price * 0.99;
      return { side: 'buy', qty, type: 'limit', price };
    }
    return null;
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (position > 0) {
    // RSI neutralized — lock gains
    if (rsi > 55) {
      return { side: 'sell', qty: position };
    }
    // ATR trailing stop
    if (entryPx != null) {
      const stopPx = entryPx - 2.0 * atr;
      if (price < stopPx) {
        return { side: 'sell', qty: position }; // market stop
      }
    }
  }

  return null;
}
