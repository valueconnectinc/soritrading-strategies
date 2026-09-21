/*
 * @coinsori-strategy v1
 * name: XRP Band Bounce Scale-Out
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion on a liquid alt, gated by the 200-SMA trend,
 * with partial profit-taking so winners can run. Bet: liquid altcoins snap
 * back toward the middle band after touching the lower band when RSI is
 * oversold — but only in an uptrend. To avoid selling the whole position at
 * the middle band and missing big uptrends, we take profit on half there and
 * keep the other half on a trailing stop.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: half at the middle
 * band, the rest on a trailing stop (price falls back 8% from the peak after
 * entry, or RSI turns overbought, or a hard 12% stop below entry).
 * When it does NOT work: strong one-way downtrends (we stay in cash, missing
 * the bounce but avoiding losses), and choppy flat regimes where the 200-SMA
 * gate whipsaws. The trailing half still gives back some gains in sharp
 * reversals, but the hard stop caps real breakdowns.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0 | 0; // force number
  const entry = ctx.entryPx || 0;

  // ---- ENTRY: mean-reversion bounce, only in an uptrend ----
  if (pos === 0) {
    // price touched/broke below lower band, RSI oversold, above 200-SMA
    if (px <= bb.lower && rsi < 35 && px > sma200) {
      ctx.state.peak = px;      // start trailing peak at entry
      ctx.state.halfKept = 0;   // not yet scaled out
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS (we hold a position) ----
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
    ctx.state.halfKept = pos / 2;              // half is now kept
    const sellQty = pos - ctx.state.halfKept;  // sell the other half
    return { side: 'sell', qty: sellQty };
  }

  // Trailing stop for the running half: exit all if price fell 8% from peak
  // (only relevant after we've scaled out once).
  if (ctx.state.halfKept > 0 && px < peak * 0.92) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
