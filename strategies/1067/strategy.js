/*
 * @coinsori-strategy v1
 * name: Donchian Channel Trend Breakout
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian channels capture sustained trend breakouts — when price
 * closes above the 20-bar high it signals accumulation momentum; when below the 20-bar
 * low it signals distribution. Simple, rule-based, and reliably generates trades.
 * When it buys and sells: Buy when price closes above the 20-bar Donchian high and
 * RSI(14) > 50 (confirming upside momentum). Sell when price closes below the 20-bar
 * Donchian low or when a 3% trailing stop is hit.
 * When it does NOT work: Choppy/ranging markets with repeated false breakouts —
 * each false breakout incurs a loss. Works best in clear trending periods.
 */

function onUpdate(ctx) {
  // Donchian channel: 20-bar lookback
  const dcLen = 20;
  const upper = ctx.high(dcLen);   // highest high of last dcLen bars
  const lower = ctx.low(dcLen);    // lowest low of last dcLen bars
  if (upper == null || lower == null) return null;

  // Indicators for confirmation
  const rsi = ctx.rsi(14);
  const price = ctx.price;
  const ema20 = ctx.ema(20);
  const ema50 = ctx.ema(50);
  const atr = ctx.atr(14);
  if (rsi == null || ema20 == null || ema50 == null || atr == null) return null;

  // Position management
  const hasPos = ctx.position > 0;
  const posValue = ctx.position * ctx.price;

  // === ENTRY: Price breaks above Donchian high with RSI confirmation ===
  // Use previous bar close (ago=1) for reliable signal — ago=0 is still forming
  const prevUpper = ctx.high(dcLen, 1);
  const prevLower = ctx.low(dcLen, 1);
  const prevClose = ctx.closes[1];  // previous bar close
  if (prevClose == null || prevUpper == null || prevLower == null) return null;

  // Buy signal: previous bar closed above upper band (breakout confirmed)
  // and RSI > 50 (uptrend confirmation), and EMA20 > EMA50 (trend aligned)
  const prevRsi = ctx.rsi(14, 1);
  const prevEma20 = ctx.ema(20, 1);
  const prevEma50 = ctx.ema(50, 1);
  if (prevRsi == null || prevEma20 == null || prevEma50 == null) return null;

  if (!hasPos && prevClose > prevUpper && prevRsi > 50 && prevEma20 > prevEma50) {
    // Enter long — use 90% of cash
    const qty = (ctx.cash * 0.9) / price;
    return { side: 'buy', qty: qty };
  }

  // === EXIT: Price breaks below Donchian low ===
  // OR trailing stop: 3 × ATR below entry
  if (hasPos) {
    const trailStop = ctx.entryPx - 3 * atr;
    const stopLoss = Math.max(lower, trailStop);

    // Sell signal: previous close below lower band
    if (prevClose < prevLower) {
      return { side: 'sell', qty: ctx.position };
    }

    // Trailing stop — sell if price drops to stop level
    if (price <= stopLoss) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
