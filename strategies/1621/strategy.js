/*
 * @coinsori-strategy v1
 * name: Funding Rate Sentiment Long
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Perpetual funding rates are a powerful sentiment signal
 * for crypto. Deeply negative funding (shorts paying longs) means the market
 * is overly bearish — a high-probability long entry. Combined with RSI
 * oversold for timing and EMA20 for trend confirmation, this catches bounces
 * where the crowd is most afraid. This is a completely different axis from
 * all the EMA/RSI/BB drafts that exist in this job.
 * When it buys and sells: BUY when funding rate < -0.01% (aggressive short
 * pressure, contrarian long), RSI < 40 (price near bottom), and price above
 * EMA20 (no major downtrend). SELL when price closes below EMA20 (trend
 * broken) or RSI > 65 (overbought).
 * When it does NOT work: In sustained downtrends where funding stays
 * negative for weeks — the strategy accumulates losing positions as shorts
 * keep being paid. Also fails when funding rate signal is stale (perp
 * markets decouple from spot).
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── Funding rate: contrarian sentiment signal ───────────────────────
  // ctx.funding is a STATE VALUE, not a function — returns rate directly
  const fundRate = ctx.funding;
  // Deeply negative = shorts paying longs → contrarian long signal
  const fundNeg  = fundRate != null && fundRate < -0.01;

  // ── EMA20: trend line for entry guard and exit ──────────────────────
  const ema20  = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  if (ema20 == null || ema20p == null) return null;
  const aboveEma20  = price > ema20;
  const ema20Rising = ema20 > ema20p;   // uptrend confirmed

  // ── RSI: pullback entry / overbought exit ───────────────────────────
  const rsi  = ctx.rsi(14, 1);
  const rsip = ctx.rsi(14, 2);
  if (rsi == null || rsip == null) return null;
  const rsiPullback   = rsi < 40;   // near-local bottom
  const rsiOverbought = rsi > 65;   // take profit

  // ── ATR: volatility sanity check ───────────────────────────────────
  const atr    = ctx.atr(14, 1);
  const atrPct = atr != null ? atr / price : null;
  // Reject entry if spread/volatility is extreme (avoid liquidations)
  const atrOk  = atrPct == null || atrPct < 0.05;

  // ── BUY: funding negative + RSI pullback + above EMA20 + ATR sane ────
  if (position === 0) {
    if (fundNeg && rsiPullback && aboveEma20 && atrOk) {
      ctx.log('BUY — funding=' + fundRate + '%, RSI=' + rsi.toFixed(1) + ', above EMA20');
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    // Fallback if funding data is missing: allow pure RSI+EMA entry
    if (fundRate == null && rsiPullback && aboveEma20 && ema20Rising && atrOk) {
      ctx.log('BUY (no funding data) — RSI pullback=' + rsi.toFixed(1) + ', EMA20 rising');
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: trend broken (below EMA20) or overbought ──────────────────
  if (position > 0) {
    const belowEma20 = price < ema20;
    if (belowEma20 || rsiOverbought) {
      ctx.log('SELL — below EMA20=' + ema20.toFixed(2) + ' or RSI overbought=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
