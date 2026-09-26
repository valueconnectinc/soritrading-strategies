/*
 * @coinsori-strategy v1
 * name: Candle-Pattern Panic Reversal BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Defensive panic-bottom family like the band-bounce
 * champion, but the entry trigger is a PRICE-ACTION confirmation (a bullish
 * engulfing or hammer-style reversal candle) that forms right after a panic
 * flush to the lower Bollinger band — instead of the RSI<30 oscillator filter.
 * Bet: a strong reversal candle after touching the lower band marks the
 * capitulation point better than a raw oversold reading, catching the same
 * bottoms with fewer false entries.
 * When it buys and sells: buys when the just-closed bar is a bullish reversal
 * candle AND the previous bar's low pierced the lower Bollinger band AND price
 * holds above the 200-SMA; sells back at the middle band or RSI>50, or on a
 * 6x-ATR stop. 5-bar cooldown.
 * When it does NOT work: in a violent crash below the 200-SMA it still buys
 * falling knives with a reversal candle; it lags strong melt-ups (sits in
 * cash during parabolic bulls). A single green bar can be a false signal in a
 * strong downtrend that keeps selling off.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  if (sma200 == null || bb == null) return null;

  // Exit logic (same proven framework as the champion)
  if (pos > 0) {
    const rsi = ctx.rsi(14, 1);
    if (rsi != null && (price >= bb.mid || rsi > 50)) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;

  // The previous bar's low pierced the lower band (panic touch) ...
  const prevLow = ctx.low(1, 2);
  const panicTouch = prevLow != null && prevLow <= bb.lower;
  // ... and the just-closed bar is a bullish reversal candle
  if (panicTouch && isBullishReversal(ctx)) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}

// Detect a bullish reversal candle on the just-closed bar using only
// high/low/close (the engine does not expose open). Returns true for a
// bullish engulfing proxy or a hammer-style close-near-high bar.
function isBullishReversal(ctx) {
  const cC = ctx.closes[ctx.i - 1];   // close of just-closed bar
  const cH = ctx.high(1, 1);          // high of just-closed bar
  const cL = ctx.low(1, 1);           // low of just-closed bar
  const pC = ctx.closes[ctx.i - 2];   // close of previous bar
  const pH = ctx.high(1, 2);          // high of previous bar
  const pL = ctx.low(1, 2);           // low of previous bar
  if (cC == null || cH == null || cL == null || pC == null || pH == null || pL == null) return false;

  const range = cH - cL;
  if (range < 1e-9) return false;

  // Bullish engulfing proxy: the current bar's close pierces the previous
  // bar's high while its low undercuts the previous low — the whole prior
  // range is swallowed and price closes above it.
  const engulf = cC > pH && cL < pL;

  // Hammer-style proxy: price closes in the upper 25% of the bar's range and
  // the lower shadow (low->close) is at least twice the upper shadow
  // (close->high) — a long lower wick rejected the selloff.
  const closeInUpper = (cC - cL) >= range * 0.75;
  const lowerWick = cC - cL;
  const upperWick = cH - cC;
  const hammer = closeInUpper && upperWick > 0 && lowerWick >= upperWick * 2;

  return engulf || hammer;
}
