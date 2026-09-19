/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe Trend Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure mean reversion (RSI oversold) fails badly in
 * sustained downtrends — RSI keeps hitting oversold while price grinds lower.
 * This strategy solves that by using a SHORT-TERM trend filter on the 4h chart
 * (EMA 48 ≈ 8-day) to define the intraday regime: it only takes RSI mean-
 * reversion entries when the short trend is bullish. In trending markets,
 * RSI oversold bounces are high-probability. In downtrends, the filter skips.
 * When it buys and sells: BUY when EMA(48) is bullish AND 4H RSI(14)
 * drops below 35 AND price is near lower Bollinger Band. SELL when 4H RSI
 * rises above 65 OR price reaches middle BB OR trend EMA flips bearish.
 * When it does NOT work: In choppy markets where EMA(48) flips
 * repeatedly — the filter causes whipsaws and skips genuine bounces.
 * Also fails in pure bear markets where even the short trend eventually breaks.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price   = ctx.price;

  // ── SHORT-TERM TREND FILTER (EMA 48 ≈ 8-day on 4h) ─────────────────
  const ema48 = ctx.ema(48, 1);  // previous bar for stability
  const trendOk = ema48 != null && price > ema48;

  // ── 4H MOMENTUM INDICATORS ─────────────────────────────────────────
  const rsi   = ctx.rsi(14, 1);
  const bb    = ctx.bb(20, 2, 1);
  if (rsi == null || bb == null) return null;

  const lowerBand = bb.lower;
  const midBand   = bb.mid;

  // ── BUY: Trend up AND RSI oversold near lower BB ─────────────────────
  if (position === 0) {
    const rsiOversold = rsi < 35;
    // Within 2% of lower BB = price at oversold extreme
    const nearLowerBB = price <= lowerBand * 1.02;
    if (trendOk && rsiOversold && nearLowerBB) {
      ctx.log('BUY — trend UP, RSI=' + rsi.toFixed(1) + ', near lower BB');
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: RSI overbought OR mid BB OR trend flips ────────────────────
  if (position > 0) {
    const rsiOverbought = rsi > 65;
    const atMidBand     = price >= midBand;
    const trendBroken   = ema48 != null && price < ema48;

    if (rsiOverbought || atMidBand || trendBroken) {
      ctx.log('SELL — RSI=' + rsi.toFixed(1) + ' | midBB=' + atMidBand + ' | trend=' + trendBroken);
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
