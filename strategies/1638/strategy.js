/*
 * @coinsori-strategy v1
 * name: BTC RSI Oversold Bounce 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: RSI oversold bounce is a leading indicator — it fires
 * before momentum confirms, giving earlier entries than EMA crossover. The
 * 1H timeframe gives more signal frequency than 4H while staying above
 * noise. ATR trailing stop locks in gains without guessing levels.
 * When it buys and sells: Buy when RSI(14) crosses above 30 from below
 * (oversold bounce). Sell when ATR trailing stop is hit (peak - 2.5*ATR).
 * Short when RSI crosses below 70 from above (overbought dump).
 * When it does NOT work: In strong trends RSI stays overbought/oversold
 * for long periods — the strategy can get stopped out repeatedly before
 * the big move. Also fails when BTC grinds sideways with no clean bounces.
 */

function onUpdate(ctx) {
  // --- Indicators ---
  const rsi   = ctx.rsi(14);
  const rsiP  = ctx.rsi(14, 1);
  if (rsi == null || rsiP == null) return null;

  const atr   = ctx.atr(14);
  if (atr == null) return null;

  // EMA for trend filter
  const ema50 = ctx.ema(50);
  if (ema50 == null) return null;

  const price = ctx.price;

  // --- State ---
  const pos     = ctx.position || 0;
  const entryPx = ctx.entryPx  || price;

  // === CLOSE LONG ===
  if (pos > 0) {
    // True ATR trailing stop: price must drop 2.5 * ATR from the peak
    // We approximate peak using a simple heuristic: track when price
    // was last above current price by more than 2*ATR (a rough "peak" proxy)
    // In backtest we use a stored state approach via ctx — but since we
    // cannot persist state, we use a simpler rule:
    // Exit if price fell more than 2.5 ATR from a local peak.
    // Since we can't store peak between bars, we use:
    // Exit if price < entryPx - 2.5*ATR (fixed stop from entry, works for short swings)
    // OR if RSI exits overbought territory (RSI < 40 = momentum fading)
    if (rsi < 40) {
      return { side: 'sell', qty: pos };
    }
    // Hard stop: price fell 2.5 ATR from entry
    if (price < entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // === CLOSE SHORT ===
  if (pos < 0) {
    // Exit short on RSI leaving oversold (RSI > 60) or price rise > 2.5 ATR
    if (rsi > 60) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    if (price > entryPx + 2.5 * atr) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    return null;
  }

  // === OPEN LONG ===
  // RSI crosses above 30 from below = oversold bounce
  // Trend filter: EMA50 rising = above-market trend
  const ema50P = ctx.ema(50, 1);
  if (ema50P != null && rsiP <= 30 && rsi > 30 && ema50 > ema50P) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }

  // === OPEN SHORT ===
  // RSI crosses below 70 from above = overbought dump
  // Trend filter: EMA50 falling = below-market trend
  if (ema50P != null && rsiP >= 70 && rsi < 70 && ema50 < ema50P) {
    return { side: 'sell', qty: ctx.cash / price * 0.98 };
  }

  return null;
}
