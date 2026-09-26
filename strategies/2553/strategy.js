/*
 * @coinsori-strategy v1
 * name: FearGreed Bull-Momentum Trend-Rider BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The defensive champion (fear-contrarian + EMA20 pullback) sits in
 * cash during melt-ups because strong rallies never pull back to the EMA20. This is the
 * opposite family: it BUYS ON STRENGTH. When price is in a confirmed uptrend AND
 * fear-greed is rising (bullish sentiment building), it enters and rides the trend with
 * a trailing ATR stop. Goal: capture the bull legs the champion leaves on the table.
 * When it buys and sells: buys when price is above the 50-EMA, the 20-EMA is above the
 * 50-EMA, AND fear-greed is rising (current > previous bar) — momentum confirmation.
 * Rides with a trailing ATR stop (3x ATR below the highest close since entry); exits
 * when the trailing stop hits or price falls back below the 50-EMA.
 * When it does NOT work: in choppy sideways markets the trend gate whipsaws and the
 * trailing stop gives back gains; and a late entry (already-extended rally) buys the
 * top. It does not buy panic bottoms, so it misses the biggest crash bounces that the
 * defensive champion captures.
 */
function onUpdate(ctx) {
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (ema50 == null || ema20 == null || atr == null) return null;
  if (fg == null) return null;

  // Track rolling highest close since entry for the trailing stop.
  const st = ctx.state;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Update the highest close since entry.
    if (st.highest == null || price > st.highest) st.highest = price;
    // Trailing ATR stop: exit if price falls 3x ATR below the running high.
    if (price <= st.highest - atr * 3) {
      st.highest = null;
      return { side: 'sell', qty: pos };
    }
    // Trend-break exit: back below the 50-EMA.
    if (price < ema50) {
      st.highest = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: confirmed uptrend + rising fear-greed (bullish sentiment building).
  const uptrend = ema20 > ema50 && price > ema50;
  const fgPrev = ctx.data('fg'); // same bar here; we need a rising check across bars
  // Use a stored previous fear-greed value to detect a rising reading.
  if (st.lastI !== ctx.i) {
    st.prevFg = st.curFg ?? null;
    st.lastI = ctx.i;
  }
  st.curFg = fg;
  const fgRising = st.prevFg != null && fg > st.prevFg;

  if (uptrend && fgRising) {
    st.highest = price;
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
