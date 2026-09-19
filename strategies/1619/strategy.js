/*
 * @coinsori-strategy v1
 * name: EMA20 Trend + RSI40 Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong trends, price often pulls back to the EMA20 before
 * resuming. RSI < 40 catches the pullback before the bounce — slightly looser than
 * 35 to generate more trades while still avoiding noise. The EMA20 rising requirement
 * is the key guard: it keeps us in cash during bear/range regimes when RSI would
 * hit 40 repeatedly with no follow-through. This is a refined version of the
 * capital-preserving EMA20+RSI35 strategy that showed excellent results (Exp 358).
 * When it buys and sells: BUY when price is above EMA20, EMA20 is rising (uptrend
 * confirmed), AND RSI(14) drops below 40 (pullback entry). SELL when price closes
 * below EMA20 (trend broken) OR RSI rises above 65 (overbought, take profit).
 * When it does NOT work: In choppy markets where price oscillates around EMA20
 * without a clear trend — RSI will hit 40 repeatedly in both directions, generating
 * false entries. Also fails at the start of new downtrends where price briefly
 * holds above EMA20 before breaking down.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── EMA20: the trend line ────────────────────────────────────────────
  const ema20  = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  if (ema20 == null || ema20p == null) return null;
  const aboveEma20   = price > ema20;
  const ema20Rising  = ema20 > ema20p;   // trend is up — the key guard

  // ── RSI: pullback entry / overbought exit ───────────────────────────
  const rsi  = ctx.rsi(14, 1);
  const rsip = ctx.rsi(14, 2);
  if (rsi == null || rsip == null) return null;
  const rsiPullback = rsi < 40;      // looser than 35 → more trades
  const rsiOverbought = rsi > 65;    // take profit

  // ── BUY: pullback entry — price above EMA20, EMA20 rising, RSI < 40 ──
  if (position === 0) {
    if (aboveEma20 && ema20Rising && rsiPullback) {
      ctx.log('BUY — EMA20 up, RSI pullback=' + rsi.toFixed(1));
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
