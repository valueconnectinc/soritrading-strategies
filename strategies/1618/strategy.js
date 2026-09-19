/*
 * @coinsori-strategy v1
 * name: RSI Oversold Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI < 35 is one of the most reliable oversold signals
 * for mean-reversion entries in crypto. When price has fallen and RSI hits 35,
 * the selling pressure is exhausted and a bounce is likely. The EMA20 exit
 * ensures we don't hold through a real breakdown. Simple, low-noise, high-
 * conviction entries.
 * When it buys and sells: BUY when RSI(14) drops below 35 (oversold bounce).
 * SELL when price closes below EMA20 (trend broken) OR RSI rises above 65
 * (overbought, take profit).
 * When it does NOT work: In strong downtrends where RSI stays oversold for
 * extended periods — the strategy accumulates losing positions as price
 * continues falling. Also fails in choppy markets where RSI oscillates
 * around 35 repeatedly without a clean bounce.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── EMA20: trend line for exit ───────────────────────────────────────
  const ema20 = ctx.ema(20, 1);
  if (ema20 == null) return null;

  // ── RSI: oversold entry / overbought exit ───────────────────────────
  const rsi  = ctx.rsi(14, 1);
  const rsip = ctx.rsi(14, 2);
  if (rsi == null || rsip == null) return null;

  const rsiOversold   = rsi < 35;
  const rsiWasMoreOversold = rsip < rsi;   // RSI is recovering (not still falling)
  const rsiOverbought = rsi > 65;

  // ── BUY: RSI deeply oversold AND starting to recover ──────────────────
  // "was more oversold" confirms the bounce has started, not just a pause
  if (position === 0) {
    if (rsiOversold && rsiWasMoreOversold) {
      ctx.log('BUY — RSI oversold bounce, RSI=' + rsi.toFixed(1) + ', EMA20=' + ema20.toFixed(2));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: trend broken (below EMA20) or overbought ───────────────────
  if (position > 0) {
    const belowEma20 = price < ema20;
    if (belowEma20 || rsiOverbought) {
      ctx.log('SELL — below EMA20 or RSI overbought, RSI=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
