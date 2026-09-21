/*
 * @coinsori-strategy v1
 * name: SOL Band Bounce
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion on SOL, gated by the 200-SMA trend, with
 * partial profit-taking so winners can run. Same logic as the validated LTC
 * and DOT Band Bounce, ported to SOL to test whether the edge generalizes to
 * a high-momentum major alt. Bet: SOL snaps back toward the middle band after
 * touching the lower band when RSI is oversold — but only in an uptrend.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: half at the middle
 * band, the rest on a trailing stop (price falls 8% from peak after entry,
 * or RSI turns overbought, or a hard 12% stop below entry).
 * When it does NOT work: SOL is much more volatile than LTC/DOT, so deep
 * lower-band touches are noisier and the 8% trailing stop may be too tight
 * for its swings. Strong one-way downtrends keep us in cash. If SOL's sharp
 * momentum dominates, the mean-reversion edge may not hold (as it failed on
 * ETH, ADA and BCH but held on LTC, DOT and XRP).
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

  // ---- ENTRY: deep oversold bounce at the lower band, only in an uptrend ----
  if (pos === 0) {
    if (px <= bb.lower && rsi < 35 && px > sma200) {
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
