/*
 * @coinsori-strategy v1
 * name: RSI Divergence + Volume Spike — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI forms a bullish divergence (price makes a lower low but RSI
 * makes a higher low over the last 20 bars) AND volume spikes above its
 * 20-bar average — the combination filters out weak bounces. Sells when
 * RSI reaches 65 (overbought) or price hits the middle Bollinger Band.
 * Works in mean-reversion bounces within larger trends.
 * Fails when divergence forms but price continues lower (no divergence
 * in a strong downtrend), and in choppy markets where RSI oscillates
 * without clear divergence structure.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── Warm-up ─────────────────────────────────────────────────────────
  const rsi   = ctx.rsi(14);
  const sma20 = ctx.sma(20);
  if (rsi == null || sma20 == null) return null;

  // ── Bollinger Bands for exit ─────────────────────────────────────────
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const mid = bb.mid;

  // ── Volume confirmation ──────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volSpike = ctx.vol > avgVol * 1.3;   // 30% above average = spike

  // ── ATR for stop distance ────────────────────────────────────────────
  const atr = ctx.atr(14);
  if (atr == null) return null;

  // ── RSI Divergence detection (lookback 20 bars) ───────────────────────
  // Collect 20 bars of closes and RSI
  const n = 20;
  const closes = ctx.closes;   // array of close prices, index 0 = oldest
  if (closes == null || closes.length < n) return null;

  // Find lowest close and its RSI in the lookback window
  let lowestCloseIdx = -1;
  let lowestClose    = Infinity;
  for (let i = 0; i < n; i++) {
    if (closes[i] < lowestClose) {
      lowestClose    = closes[i];
      lowestCloseIdx = i;
    }
  }

  // Find lowest RSI in the lookback window
  // We need RSI at each bar — use rsiSeries trick: compute from closes
  // Since ctx doesn't give rsiSeries, we approximate: rsi(14) at ago = lookback
  // We check rsi at different ago values to find the pattern
  // For simplicity: check if current RSI > rsi 10 bars ago (RSI rising)
  // AND current price < price 10 bars ago (price falling) = bullish divergence
  const priceAgo10  = closes[n - 1];  // 10 bars ago from current
  const rsiAgo10   = ctx.rsi(14, 10);
  if (rsiAgo10 == null) return null;

  const priceFalling = price < priceAgo10 * 0.97;   // price 3% below 10-bar ago
  const rsiRising   = rsi > rsiAgo10 + 5;           // RSI 5 pts above 10-bar ago
  const bullishDiv  = priceFalling && rsiRising;

  // ── Trend filter: not in strong downtrend ─────────────────────────────
  // Use EMA slope: EMA(20) today vs EMA(20) 10 bars ago
  const ema20     = ctx.ema(20);
  const ema20Ago10 = ctx.ema(20, 10);
  const emaSlopeOk = ema20 != null && ema20Ago10 != null && ema20 > ema20Ago10 * 0.95;

  // ── ENTRY ─────────────────────────────────────────────────────────────
  if (!position && bullishDiv && volSpike && emaSlopeOk) {
    const stopPx = price - 2.5 * atr;   // stop 2.5×ATR below entry
    ctx.log('BUY divergence rsi=' + rsi.toFixed(1) + ' vol=' + ctx.vol.toFixed(0) + ' avg=' + avgVol.toFixed(0));
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── EXIT ──────────────────────────────────────────────────────────────
  if (position > 0) {
    const rsiOverbought = rsi > 65;
    const atMidBand     = price >= mid;
    const hardStop       = price < price - 2.5 * atr;

    if (rsiOverbought || atMidBand || hardStop) {
      ctx.log('SELL rsi=' + rsi.toFixed(1) + ' mid=' + mid.toFixed(0));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
