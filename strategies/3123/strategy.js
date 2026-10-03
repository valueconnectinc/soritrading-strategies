/*
 * @coinsori-strategy v1
 * name: ADA Keltner MR 4H Trend-Gated HalfTP
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated ADA Keltner MR champion sells the whole position
 * when price recovers to the 20-EMA, giving back the momentum after the bounce. This
 * version sells HALF at the 20-EMA (locks in the mean-reversion gain) and rides the
 * rest with an ATR trailing stop, capturing any continuation of the bounce.
 * When it buys and sells: same entry as the champion (buy pullback below EMA20-2.5ATR
 * with RSI<40 above the 200-SMA). Exit: sell half when price recovers to the 20-EMA,
 * then trail the remaining half with a 3x ATR stop from the highest close since entry.
 * When it does NOT work: same as the champion (lags melt-ups, misses crash bounces);
 * the trailing leg can give back gains in a sharp reversal after the half-TP.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Track highest close since entry for the trailing stop.
    if (st.hi == null || price > st.hi) st.hi = price;
    const trail = st.hi - 3 * atr; // 3x ATR trailing stop from the high

    if (st.halfDone) {
      // Second half: trail with the ATR stop. Also exit if it falls back below EMA20.
      if (price < trail || price < ema20) {
        st.halfDone = false; st.hi = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }

    // First half: sell when price recovers to the 20-EMA (mean reversion complete).
    if (price > ema20 && cd === 0) {
      const half = pos * 0.5;
      st.halfDone = true;
      st.cd = 2;
      if (pos - half <= 0.0001) { st.halfDone = false; st.hi = null; return { side: 'sell', qty: pos }; }
      return { side: 'sell', qty: half };
    }
    return null;
  }

  // Reset state when flat.
  st.halfDone = false; st.hi = null;

  const keltnerLow = ema20 - 2.5 * atr;
  if (price < keltnerLow && rsi < 40 && price > sma200 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
