/*
 * @coinsori-strategy v1
 * name: LTC Band Bounce On-Chain Filter 4H
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: The validated LTC 4h band-bounce edge (beat buy-and-hold in
 * 2/3 walk-forward windows, low MDD) buys deep oversold lower-band touches gated
 * by the 200-SMA. This version adds an on-chain network-health filter: BTC active
 * addresses (a proxy for real network usage) must be above their own slow average.
 * The bet: oversold bounces are far more reliable when the underlying network is
 * in a healthy/growing phase; in network-decline bear markets the "bounce" is
 * often a falling knife.
 * When it buys: price touches the lower Bollinger band, RSI is oversold (< 35),
 * price is above the 200-SMA, AND BTC active addresses are above their 90-period
 * average. When it sells: half at the middle band, the rest on RSI overbought,
 * a trailing stop, or a hard stop below entry.
 * When it does NOT work: if the on-chain series lags price badly, the filter may
 * keep us in cash through the start of a recovery. In choppy flat regimes the
 * 200-SMA gate whipsaws. On-chain data is daily so it adds no intraday timing.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  // ---- On-chain network-health filter ----
  // BTC active addresses: only take bounce entries when network usage is
  // above its own slow average (healthy/growing phase).
  const addr = ctx.data('addr');
  let netHealthy = true; // default to allowing if data unavailable (don't block)
  if (addr != null) {
    // ctx.data returns current value; we compare against a stored rolling avg.
    const ra = ctx.state.addrAvg;
    if (ra != null) {
      netHealthy = addr >= ra;
    }
    // update rolling average (exponential, ~90 periods of the data cadence)
    ctx.state.addrAvg = ra == null ? addr : ra * 0.99 + addr * 0.01;
  }

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // ---- ENTRY: deep oversold bounce at lower band, uptrend, healthy network ----
  if (pos === 0) {
    if (px <= bb.lower && rsi < 35 && px > sma200 && netHealthy) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS (same as validated base) ----
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
