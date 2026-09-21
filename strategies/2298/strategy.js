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
 * oversold — but only in an uptrend. To fix the previous weakness (selling
 * the whole position at the middle band and missing big uptrends), we take
 * profit on half there and keep the other half on a trailing stop.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: half at the middle
 * band, the rest on a trailing stop (price falls back X% from the peak after
 * entry, or RSI turns overbought).
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

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;
  if (pos === 0) return null;

  // Hard stop: exit all if price fell 12% below entry (real breakdown)
  if (entry > 0 && px < entry * 0.88) {
    return { side: 'sell', qty: pos };
  }

  // Track the highest price since entry via state to trail the running half.
  // state persists across bars; store the trailing peak.
  const peak = ctx.state.peak ? Math.max(ctx.state.peak, px) : Math.max(entry, pxipse);
  ctx.state.peak = peak;

  // If RSI turns overbought, exit everything (bounce played out)
  if (rsi > 65) {
    return { side: 'sell', qty: pos };
  }

  // Scale out: at the middle band, if we still hold more than half, sell down to half.
  if (px >= bb.mid && pos > ctx.state.halfKept) {
    const sellQty = pos - ctx.state.halfKept;
    return { side: 'sell', qty: sellQty };
  }
  // Mark that we've scaled out once so we don't re-sell at the middle band.
  if (px >= bb.mid && ctx.state.halfKept == null) {
    ctx.state.halfKept = pos / 2;
  }

  // Trailing stop for the running half: exit if price fell 8% from the peak
  // (after we've already scaled out once)
  if (ctx.state.halfKept != null && px < peak * 0.92) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
