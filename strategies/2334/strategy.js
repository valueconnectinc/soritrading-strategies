/*
 * @coinsori-strategy v1
 * name: LTC StochRSI Mean Reversion 4H
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Mature alts like LTC mean-revert after deep oversold dips because
 * panic selling is followed by a snap-back. This uses a different oversold signal
 * (Stochastic + RSI) than the validated Bollinger band-bounce to test if the edge persists.
 * When it buys and sells: Buys when price is below the lower Bollinger band AND the
 * stochastic is deeply oversold AND RSI is weak, but only while the long-term trend is intact
 * (price above the 200-period SMA). Sells half at the middle band, the rest when the
 * stochastic turns back up, with a hard stop to cap a failed bounce.
 * When it does NOT work: In strong trending markets (deep bull or deep bear) the "oversold"
 * bounce can be a falling knife — this loses when a dip keeps falling instead of snapping back.
 */
function onUpdate(ctx) {
  // ---- indicators (guard every read; ago=1 uses closed bars) ----
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const bb = ctx.bb(20, 2, 1);
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  const st = ctx.stoch(14, 3, 1);
  if (st == null || st.k == null) return null;
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  // ---- exits (check before entries) ----
  if (pos > 0) {
    // hard stop: cut a failed bounce at 12% below entry (band-bounce family uses ~12%)
    if (price <= ctx.entryPx * 0.88) {
      return { side: 'sell', qty: pos };
    }
    // scale out half at the middle band to lock gains
    if (price >= bb.mid) {
      return { side: 'sell', qty: pos * 0.5 };
    }
    // exit the rest when stochastic recovers above 50 (bounce played out)
    if (st.k > 50) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // ---- entry ----
  // only buy while long-term trend is intact (above 200-SMA) to avoid bear falling knives
  if (price < sma200) return null;
  // deep oversold: price under lower band, stochastic < 20, RSI < 40
  if (price < bb.lower && st.k < 20 && rsi < 40) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
