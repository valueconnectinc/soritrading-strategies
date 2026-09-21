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
 * When it buys: (A) price touches the lower Bollinger band with RSI<35 above
 * the 200-SMA (deep oversold bounce); or (B) a healthy pullback to the middle
 * band in a strong uptrend (RSI 40-60, price well above SMA200) so we don't
 * sit in cash during bull runs. When it sells: half at the middle band, the
 * rest on a trailing stop (price falls 8% from peak), or RSI overbought, or a
 * hard 12% stop below entry.
 * When it does NOT work: strong one-way downtrends (we stay in cash) and
 * choppy flat regimes where the trend gate whipsaws. The trailing half gives
 * back some gains in sharp reversals, but the hard stop caps real breakdowns.
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
    // (A) deep oversold bounce at the lower band, only in an uptrend
    const oversoldBounce = px <= bb.lower && rsi < 35 && px > sma200;
    // (B) healthy pullback to the middle band in a strong uptrend
    //     (price clearly above SMA200, RSI mid-range = pullback not crash)
    const strongTrend = px > sma200 * 1.05;
    const pullback = px <= bb.mid && rsi >= 40 && rsi <= 60 && strongTrend;

    if (oversoldBounce || pullback) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS ----
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
