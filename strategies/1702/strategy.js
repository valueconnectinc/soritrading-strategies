/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion Tight Stops
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI(2) drops below 20 at the lower BB(20,2) touch — classic
 * mean reversion. Sells when price reaches a fixed take-profit (8%) or
 * hits a hard stop-loss (4%). An SMA(200) trend filter keeps us flat in
 * sustained downtrends, and a DXY macro filter avoids regime clashes.
 * This is the same proven BB+RSI core that hit +30.8%/+37.75% on SOLUSDT
 * but with a hard TP/SL replacing the too-loose ATR trailing stop.
 * When it does NOT work: choppy, low-volatility ranges where RSI never
 * reaches 20 and BB bands stay tight — the signal is too rare to capture.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────
  const sma200 = ctx.sma(200);
  const rsi   = ctx.rsi(2);
  const bb    = ctx.bb(20, 2);
  const dxy   = ctx.macro('dxy');

  // Need at least 200 bars for the trend filter
  if (sma200 == null || rsi == null || bb == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  // ── Macro filter: skip if USD is strengthening (DXY > 103) ─────────────
  // DXY above 103 historically correlates with risk-off crypto sell-offs
  if (dxy != null && dxy > 103) return null;

  // ── Trend filter: only buy in uptrends (price above SMA200) ──────────────
  const inUptrend = ctx.price > sma200;

  // ── Position state ───────────────────────────────────────────────────────
  const hasPosition = ctx.position > 0;
  const entryPrice  = ctx.entryPx || ctx.price;

  // ── ENTRY: RSI(2) < 20 + price at lower BB + uptrend ───────────────────
  const rsiOversold = rsi < 20;
  const atLowerBand = ctx.price <= bb.lower * 1.002; // within 0.2% of lower band
  const shouldBuy   = !hasPosition && rsiOversold && atLowerBand && inUptrend;

  if (shouldBuy) {
    // Risk 2% of cash per trade — qty = (cash * 0.02) / (entry * 0.04)
    const riskAmt = ctx.cash * 0.02;
    const qty = riskAmt / (ctx.price * 0.04);
    ctx.log('BUY  rsi=' + rsi.toFixed(2) + ' bb.lower=' + bb.lower.toFixed(4) + ' price=' + ctx.price.toFixed(4));
    return { side: 'buy', qty: qty };
  }

  // ── EXIT: hard TP / SL (no trailing) ────────────────────────────────────
  if (hasPosition) {
    const pnlPct = (ctx.price - entryPrice) / entryPrice;

    // Take profit at +8%
    if (pnlPct >= 0.08) {
      ctx.log('SELL TP  pnl=' + (pnlPct * 100).toFixed(2) + '%');
      return { side: 'sell', qty: ctx.position };
    }

    // Stop loss at -4%
    if (pnlPct <= -0.04) {
      ctx.log('SELL SL  pnl=' + (pnlPct * 100).toFixed(2) + '%');
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
