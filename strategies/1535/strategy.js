/*
 * @coinsori-strategy v1
 * name: RSI Divergence + BB Squeeze v2 — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean-reversion on BTCUSDT 4H. Primary entry: hidden RSI divergence
 * (price makes lower low, RSI makes higher low over 10 bars — shorter
 * lookback than v1 for more signals). Secondary entry: RSI < 35 with
 * price within 2% of lower Bollinger Band — catches oversold bounces
 * even without a clean divergence pattern.
 * ATR-based stop (1.5× ATR) and 5% profit target. Volume filter
 * prevents entries on dead-low volume days.
 * Works in trending corrections and range bounces. Fails in sharp
 * one-shot drops where RSI stays oversold — divergence is probabilistic.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;
  const i        = ctx.i;

  if (i < 50) return null;

  const bb  = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  const atr = ctx.atr(14);
  if (bb == null || rsi == null || atr == null) return null;

  const lower = bb.lower;
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volOk = ctx.vol >= avgVol * 0.5;

  // ── Primary entry: hidden RSI divergence (10-bar lookback) ───────────
  const rsi10  = ctx.rsi(14, 10);
  const close10 = ctx.sma(1, 10);   // close 10 bars ago (SMA of period 1 = close)
  const priceLL = rsi10 != null && close10 != null
    ? price < close10               // price made a lower low
    : false;
  const rsiHL   = rsi10 != null ? rsi >= rsi10 : false;  // RSI made a higher low
  const rsiDiv  = priceLL && rsiHL;

  // ── Secondary entry: RSI oversold + near lower band ───────────────────
  // Catches oversold bounces even without a clean divergence signal
  const rsiOversold = rsi < 35;
  const nearLower   = price <= lower * 1.02;   // within 2% of lower band

  // ── ENTRY: (divergence OR oversold) + BB zone + volume ──────────────
  if (!position && volOk && (rsiDiv || (rsiOversold && nearLower))) {
    const stopPx = price - 1.5 * atr;
    const risk   = (price - stopPx) * ctx.cash / price;
    let qty;
    if (risk > ctx.cash * 0.05) {
      qty = (ctx.cash * 0.05) / (price - stopPx);  // cap risk at 5%
    } else {
      qty = ctx.cash / price * 0.99;
    }
    const sig = rsiDiv ? 'div' : 'oversold';
    ctx.log('BUY ' + sig + ' | RSI=' + rsi.toFixed(1) + ' atrStop=' + stopPx.toFixed(0));
    return { side: 'buy', qty: qty };
  }

  // ── EXIT: +5% profit, RSI > 65, or ATR hard stop ─────────────────────
  if (position > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const profitT = pnlPct >= 0.05;
    const rsiOB    = rsi > 65;
    const hardStop = price < entryPx - 1.5 * atr;

    if (profitT || rsiOB || hardStop) {
      ctx.log('SELL | pnl=' + (pnlPct*100).toFixed(1) + '% rsi=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
