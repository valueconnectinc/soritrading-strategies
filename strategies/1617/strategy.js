/*
 * @coinsori-strategy v1
 * name: EMA20 Trend + RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong trends, price often pulls back to the EMA20 before
 * resuming. RSI measures how oversold that pullback is — buying when RSI < 35
 * catches the dip before the bounce. The EMA20 direction confirms the trend is
 * still intact. This is a pullback-entry strategy, not a breakout strategy.
 * When it buys and sells: BUY when price is above EMA20 (uptrend confirmed) AND
 * RSI(14) drops below 35 (oversold pullback). SELL when price closes below EMA20
 * (trend broken) OR RSI rises above 65 (overbought, take profit).
 * When it does NOT work: In choppy markets where price oscillates around EMA20
 * without a clear trend — RSI will hit 35 repeatedly in both directions,
 * generating false entries. Also fails at the start of new downtrends where
 * price briefly holds above EMA20 before breaking down.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── EMA20: the trend line ────────────────────────────────────────────
  const ema20  = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);   // previous bar for direction check
  if (ema20 == null || ema20p == null) return null;
  const aboveEma20  = price > ema20;
  const ema20Rising = ema20 > ema20p;   // trend is up

  // ── RSI: oversold pullback / overbought exit ─────────────────────────
  const rsi  = ctx.rsi(14, 1);
  const rsip = ctx.rsi(14, 2);
  if (rsi == null || rsip == null) return null;
  const rsiOversold = rsi < 35;     // buy the dip
  const rsiOverbought = rsi > 65;   // take profit

  // ── ATR: measure recent volatility for context ────────────────────────
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  // ── BUY: pullback entry — price above EMA20, RSI oversold ────────────
  if (position === 0) {
    if (aboveEma20 && ema20Rising && rsiOversold) {
      ctx.log('BUY — EMA20 trend up, RSI pullback=' + rsi.toFixed(1));
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
