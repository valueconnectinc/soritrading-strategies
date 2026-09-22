/*
 * @coinsori-strategy v1
 * name: LTC Band Bounce + Bull Overlay 4H
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: The plain LTC 4h band-bounce is a validated defensive
 * winner (beat buy-and-hold in 2/3 walk-forward windows, crushed both bear
 * markets, MDD 15-27%). Its ONE documented weakness is that it lags strong
 * bull runs: it only buys on deep lower-band touches, so in a sustained
 * uptrend price rarely pulls back far enough and the strategy sits in cash.
 * This version keeps the proven deep-oversold bounce but ADDS a bull-mode
 * overlay: when the trend is strongly up, it buys shallower pullbacks so it
 * participates in the run instead of watching it pass.
 * When it buys: (1) deep oversold bounce at the lower band with RSI<35 in an
 * uptrend (the proven edge), OR (2) in a strong bull (price well above 200-SMA
 * and above the mid band) a shallower pullback to the mid band with RSI<50.
 * When it sells: half at the mid band, rest on RSI>65, a trailing stop 8% off
 * peak, or a hard 12% stop below entry.
 * When it does NOT work: choppy flat regimes where the 200-SMA gate and the
 * bull overlay whipsaw, and a straight parabolic melt-up where any pullback
 * entry is too late. The bull overlay adds trades, so fees and whipsaw risk
 * are higher than the plain version.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // ---- ENTRY ----
  if (pos === 0) {
    // Path 1 (proven): deep oversold bounce at the lower band, uptrend only.
    if (px <= bb.lower && rsi < 35 && px > sma200) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    // Path 2 (new overlay): strong bull, shallower pullback to the mid band.
    // Only fire when the trend is clearly up (price >1.05x the 200-SMA so we
    // are well inside a bull, not near the gate) AND price is at/above mid band
    // (no falling knife). This is the anti-lag addition for bull runs.
    if (px > sma200 * 1.05 && px >= bb.mid && rsi < 50) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS ----
  // Hard stop: real breakdown, exit everything.
  if (entry > 0 && px < entry * 0.88) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  // Track the highest price since entry (trailing peak).
  const peak = Math.max(ctx.state.peak || entry || px, px);
  ctx.state.peak = peak;

  // RSI overbought: bounce fully played out, exit everything.
  if (rsi > 65) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  // Scale out: when price reaches the middle band and we haven't scaled yet,
  // sell down to half the position.
  if (ctx.state.halfKept === 0 && px >= bb.mid) {
    ctx.state.halfKept = pos / 2;
    const sellQty = pos - ctx.state.halfKept;
    return { side: 'sell', qty: sellQty };
  }

  // Trailing stop for the running half: exit all if price fell 8% from peak.
  if (ctx.state.halfKept > 0 && px < peak * 0.92) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
