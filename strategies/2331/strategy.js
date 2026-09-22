/*
 * @coinsori-strategy v1
 * name: DOT Band Bounce On-Chain Filter 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: DOT 4h band-bounce is a validated defensive winner (made
 * money in all 3 windows, crushed both bears: W2 +10.6% vs -63% hold, W3 +0.3%
 * vs -82% hold). This version adds an on-chain network-health filter (BTC active
 * addresses above their rolling average) to see if it can lift the weak recent
 * window and cut drawdown further. Bet: oversold lower-band bounces are more
 * reliable when the underlying network is in a healthy/growing phase.
 * When it buys: price touches the lower Bollinger band, RSI < 35, price above
 * the 200-SMA, AND BTC active addresses above their rolling average. When it
 * sells: half at the middle band, rest on RSI overbought, trailing stop, or hard
 * stop below entry.
 * When it does NOT work: on-chain data is daily so it adds no intraday timing;
 * if it lags price it may keep us in cash through the start of a recovery.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  // On-chain network-health filter: BTC active addresses above rolling avg.
  const addr = ctx.data('addr');
  let netHealthy = true;
  if (addr != null) {
    const ra = ctx.state.addrAvg;
    if (ra != null) netHealthy = addr >= ra;
    ctx.state.addrAvg = ra == null ? addr : ra * 0.99 + addr * 0.01;
  }

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  if (pos === 0) {
    if (px <= bb.lower && rsi < 35 && px > sma200 && netHealthy) {
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
