/*
 * @coinsori-strategy v1
 * name: RSI Bollinger Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI at extremes near Bollinger Band edges means price has
 * temporarily extended away from its mean. Mean reversion expects a snap back.
 * When it buys and sells: Buy when RSI < 30 (oversold) AND price is at or below
 * the lower Bollinger Band — price has extended down and should bounce.
 * Sell when RSI > 70 (overbought) OR price reaches the upper Bollinger Band.
 * When it does NOT work: In strong trending markets where "oversold stays oversold"
 * for days or weeks — the bounce never comes and losses accumulate.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  const rsi = ctx.rsi(14);
  const bb  = ctx.bb(20, 2); // { upper, mid, lower }

  if (rsi == null || bb == null) return null;

  const price   = ctx.price;
  const lower   = bb.lower;
  const upper   = bb.upper;
  const mid     = bb.mid;

  // RSI oversold zone
  const rsiOversold = rsi < 35;
  // RSI overbought zone
  const rsiOverbought = rsi > 68;

  // Price at or below lower band (extended downward)
  const atLowerBand = price <= lower;
  // Price at or above upper band
  const atUpperBand = price >= upper;

  // Volume filter: confirm with above-average volume
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.8;

  // ── ENTRY ──
  if (ctx.position === 0) {
    // Buy when RSI oversold AND price at/outside lower band
    if (rsiOversold && atLowerBand && volOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // ── EXIT ──
  if (ctx.position > 0) {
    // Sell on RSI overbought OR price reached upper band
    if (rsiOverbought || atUpperBand) {
      return { side: 'sell', qty: ctx.position };
    }
    // Also exit if RSI has bounced back above 50 (momentum restored)
    if (rsi > 50) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
