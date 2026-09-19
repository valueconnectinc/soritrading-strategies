/*
 * @coinsori-strategy v1
 * name: RSI Divergence + BB Squeeze — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean-reversion on BTCUSDT 4H using hidden RSI divergence as the primary
 * entry signal — price makes a lower low while RSI makes a higher low,
 * signalling downward momentum is weakening. Combined with Bollinger Band
 * confirmation (price near or below lower band) and a volume filter to
 * avoid choppy entries. ATR-based hard stop and 4% profit target.
 * Works in trending corrections and range bounces. Fails in sharp one-shot
 * drops where divergence forms but price keeps falling — divergence is a
 * probabilistic signal, not a guarantee of reversal.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;
  const i        = ctx.i;

  // ── Warm-up: need at least 60 bars for divergence detection ──────────
  if (i < 60) return null;

  const bb = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  const atr = ctx.atr(14);
  if (bb == null || rsi == null || atr == null) return null;

  const lower = bb.lower;
  const mid   = bb.mid;

  // ── Volume filter: skip low-volume bars (reduces chop) ────────────────
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volOk = ctx.vol >= avgVol * 0.5;   // at least 50% of average volume

  // ── RSI Divergence detection ───────────────────────────────────────────
  // Compare current RSI to RSI 20 bars ago
  // Hidden bullish divergence: price made a lower low (price < price[20])
  // while RSI made a higher low (rsi >= rsi[20]) — momentum weakening
  const rsi20  = ctx.rsi(14, 20);   // RSI 20 bars ago
  const price20 = ctx.price;        // current price (already has ago=0 default)
  const price20ago = ctx.price;     // price 20 bars ago — use sma(1,20) as proxy
  // Use sma(1, ago) as close price proxy (SMA of period 1 = close itself)
  const close20 = ctx.sma(1, 20);
  if (rsi20 == null || close20 == null) return null;

  let rsiDivergence = false;
  const priceLL = price20 < close20;   // price made a lower low
  const rsiHL   = rsi >= rsi20;         // RSI made a higher low (divergence)
  rsiDivergence = priceLL && rsiHL;

  // ── BB confirmation: price within 1.5% of lower band or below it ───────
  // This confirms we're in the oversold zone of the current distribution
  const nearLowerBand = price <= lower * 1.015;

  // ── TREND FILTER: only trade when SMA50 is rising ─────────────────────
  const sma50  = ctx.sma(50);
  const sma50p = ctx.sma(50, 1);
  if (sma50 == null || sma50p == null) return null;
  const trendOk = sma50 > sma50p;   // SMA50 rising = minor trend up

  // ── ENTRY: divergence + BB confirmation + volume + trend ─────────────
  if (!position && rsiDivergence && nearLowerBand && volOk && trendOk) {
    // ATR-based stop: 1.5× ATR below entry
    const stopPx = price - 1.5 * atr;
    const risk   = (price - stopPx) * ctx.cash / price;
    if (risk > ctx.cash * 0.05) {
      // Risk > 5% of capital — reduce position size
      const qty = (ctx.cash * 0.05) / (price - stopPx);
      ctx.log('BUY div+BB | RSI=' + rsi.toFixed(1) + ' atrStop=' + stopPx.toFixed(0));
      return { side: 'buy', qty: qty };
    }
    ctx.log('BUY div+BB | RSI=' + rsi.toFixed(1) + ' atrStop=' + stopPx.toFixed(0));
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── EXIT: profit target, RSI overbought, or hard ATR stop ───────────
  if (position > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;

    const profitTarget = pnlPct >= 0.04;     // +4% take-profit
    const rsiOB        = rsi > 65;           // RSI overbought exit
    const hardStop     = price < entryPx - 1.5 * atr; // ATR-based hard stop

    if (profitTarget || rsiOB || hardStop) {
      ctx.log('SELL | pnl=' + (pnlPct*100).toFixed(1) + '% rsi=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
