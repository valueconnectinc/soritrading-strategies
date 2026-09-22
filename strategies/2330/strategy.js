/*
 * @coinsori-strategy v1
 * name: ETC LINK Band Bounce
 * ex: binance
 * syms: ETCUSDT, LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Bollinger-band mean reversion on mature, lower-volatility
 * alts. This is the identical logic that generalized cleanly to XRP, LTC and
 * DOT on 4h. ETC and LINK are two new, untried candidates in the same
 * low-volatility class, so this tests whether the edge extends to a 4th and
 * 5th asset. Bet: a liquid alt snaps back toward the middle band after
 * touching the lower band when RSI is oversold, but only in an uptrend.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: half at the middle
 * band, the rest on RSI turning overbought (> 65) or a hard 12% stop below
 * entry.
 * When it does NOT work: strong one-way downtrends (we stay in cash, missing
 * the bounce but avoiding losses) and choppy flat regimes where the 200-SMA
 * gate whipsaws. Like the other high-vol alts (DOGE/SOL), if ETC or LINK turn
 * out to be too volatile for this edge, they will lose in bear windows.
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

  // Scale out: when price reaches the middle band, sell down to half position.
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
