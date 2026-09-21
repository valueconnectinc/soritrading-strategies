/*
 * @coinsori-strategy v1
 * name: ADA Band Bounce
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion on ADA, gated by the 200-SMA trend, with
 * partial profit-taking. Same logic that validated on XRP and LTC (family is
 * asset-specific). Bet: a liquid alt snaps back toward the middle band after
 * touching the lower band when RSI is oversold — but only in an uptrend.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: half at the middle
 * band, the rest on a trailing stop (8% from peak, RSI overbought, or hard
 * 12% stop below entry).
 * When it does NOT work: strong one-way downtrends and choppy flat regimes.
 * ADA's higher volatility may change the edge vs the low-vol LTC winner.
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

  if (pos === 0) {
    if (px <= bb.lower && rsi < 35 && px > sma200) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  if (entry > 0 && px < entry * 0.88) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  const peak = Math.max(ctx.state.peak || entry || px, px);
  ctx.state.peak = peak;

  if (rsi > 65) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  if (ctx.state.halfKept === 0 && px >= bb.mid) {
    ctx.state.halfKept = pos / 2;
    const sellQty = pos - ctx.state.halfKept;
    return { side: 'sell', qty: sellQty };
  }

  if (ctx.state.halfKept > 0 && px < peak * 0.92) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
