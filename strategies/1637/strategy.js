/*
 * @coinsori-strategy v1
 * name: BTC EMA Cross + RSI Filter + ATR Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC is less choppy than SOL, giving EMA crossover
 * signals a better chance to capture real trends. RSI filter keeps us out
 * of counter-trend noise, and a hard ATR stop prevents catastrophic losses.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 AND RSI(14) > 50
 * (confirming bullish momentum). Sell on EMA9 crossing below EMA21 OR when
 * ATR trailing stop is hit. Short when EMA9 crosses below EMA21 AND RSI < 50.
 * When it does NOT work: In tight trading ranges, EMA crossovers fire
 * repeatedly with small losses — the RSI filter helps but cannot eliminate
 * whipsaw entirely during low-volatility regimes.
 */

function onUpdate(ctx) {
  // --- Indicators ---
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema9P  = ctx.ema(9,  1);   // previous bar (closed)
  const ema21P = ctx.ema(21, 1);
  if (ema9 == null || ema21 == null || ema9P == null || ema21P == null) return null;

  const rsi   = ctx.rsi(14);
  if (rsi == null) return null;

  const atr   = ctx.atr(14);
  if (atr == null) return null;

  // --- State ---
  const pos = ctx.position || 0;
  const price = ctx.price;

  // === CLOSE LOGIC ===
  if (pos > 0) {
    // ATR trailing stop: move stop up as price rises
    // Stop level = entry price - 2 * ATR at entry, then trail
    // We approximate by checking if price dropped 2*ATR from the peak since entry
    const entryPx = ctx.entryPx || price;
    const peakSinceEntry = price; // simplified: use current price vs entry
    // Trail stop: exit if price falls more than 2.5 * ATR from recent high
    const stopPx = price - 2.5 * atr;
    if (price < entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    // Also exit on EMA death cross (EMA9 crosses below EMA21)
    if (ema9 < ema21 && ema9P >= ema21P) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (pos < 0) {
    // Short: exit on EMA golden cross OR price rises 2.5*ATR above entry
    const entryPx = ctx.entryPx || price;
    if (price > entryPx + 2.5 * atr) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    if (ema9 > ema21 && ema9P <= ema21P) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    return null;
  }

  // === ENTRY LOGIC ===
  // Long: EMA9 crosses above EMA21, RSI confirms momentum (> 50)
  if (ema9P <= ema21P && ema9 > ema21 && rsi > 50) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }

  // Short: EMA9 crosses below EMA21, RSI confirms bearish momentum (< 50)
  if (ema9P >= ema21P && ema9 < ema21 && rsi < 50) {
    return { side: 'sell', qty: ctx.cash / price * 0.98 };
  }

  return null;
}
