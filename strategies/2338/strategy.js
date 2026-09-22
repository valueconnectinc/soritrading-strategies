/*
 * @coinsori-strategy v1
 * name: LTC StochRSI Mean Reversion 4H v3
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Mature alts like LTC mean-revert after deep oversold dips because
 * panic selling is followed by a snap-back. v3 keeps the validated entry but makes the
 * exit regime-adaptive: in a rising long-term uptrend bounces tend to overshoot the
 * middle band, so the target moves to the upper band — this fixes lagging in strong bulls.
 * When it buys and sells: Buys when price is below the lower Bollinger band AND the
 * stochastic is deeply oversold AND RSI is weak, but only while price is above the 200-SMA.
 * In normal regimes it sells everything at the middle band (or stochastic > 55); in a
 * rising long-term trend it waits for the upper band (or stochastic > 80) to let the
 * bounce run. A hard stop 12% below entry caps a failed bounce.
 * When it does NOT work: When a dip keeps falling instead of snapping back (deep bear,
 * falling knife) the stop takes the loss; and in chop just under the 200-SMA the wider
 * upper-band target can give back gains while waiting for a rally that stalls.
 */
function onUpdate(ctx) {
  // ---- indicators (guard every read; ago=1 uses closed bars only) ----
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const sma200slow = ctx.sma(200, 21); // 21 bars (~3.5 days) back: is the long trend rising?
  if (sma200slow == null) return null;
  const bb = ctx.bb(20, 2, 1);
  if (bb == null || bb.lower == null || bb.mid == null || bb.upper == null) return null;
  const st = ctx.stoch(14, 3, 1);
  if (st == null || st.k == null) return null;
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  // strong bull = long trend intact AND rising; bounces then tend to overshoot the mid band
  const strongBull = price > sma200 && sma200 > sma200slow;

  // ---- exits (checked before entries) ----
  if (pos > 0) {
    // hard stop: cut a failed bounce 12% below entry (unchanged from v2)
    if (price <= ctx.entryPx * 0.88) {
      return { side: 'sell', qty: pos };
    }
    if (strongBull) {
      // regime-adaptive target: in a rising bull, hold for the upper band / stoch overbought
      if (price >= bb.upper || st.k > 80) {
        return { side: 'sell', qty: pos };
      }
    } else {
      // normal regime: take the bounce at the middle band (v2 behaviour)
      if (price >= bb.mid || st.k > 55) {
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  // ---- entry (unchanged from tuned v2) ----
  if (price < sma200) return null; // skip falling knives below the long trend
  // deep oversold: price under lower band, stochastic < 20, RSI < 35 (deeper = fewer, cleaner trades)
  if (price < bb.lower && st.k < 20 && rsi < 35) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
