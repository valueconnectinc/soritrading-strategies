/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing + Wide-Band Flush
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated champion (3037) is consistently positive with tiny
 * drawdown but its highest-risk trade is the full-cash deep Bollinger flush — a wrong
 * flush costs more than the ATR-sized pullbacks. This adds ONE principled filter: only
 * take the full-cash flush when the Bollinger band is WIDE (bandwidth above its own
 * 50-day average), i.e. a genuine high-volatility dislocation that snaps back hard,
 * and skip quiet low-volatility grinds where a "flush" is just drift. The ATR-Keltner
 * pullback entry and the fast snap-back exit are untouched.
 * When it buys and sells: Buy at full ~95% cash on a deep Bollinger flush (close below
 * lower band 20,2.5 with RSI<30) ONLY when the band is wide (bandwidth > its 50-day
 * average), or ATR-sized on an ATR-Keltner pullback (below EMA20-2.5*ATR with RSI<40),
 * both only inside a rising 200-day average. Sell on the snap-back above the 20-day EMA
 * or RSI>55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat, and it
 * lags buy-and-hold in a relentless melt-up. If the band-width filter is too strict it
 * may skip some good full-cash flush entries (fewer full-cash trades, lower upside).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  // Bollinger bandwidth = (upper-lower)/mid; wide band = high-vol dislocation.
  const bw = (bb.upper - bb.lower) / ((bb.upper + bb.lower) / 2);
  if (!Number.isFinite(bw) || bw <= 0) {
    ctx.state.bwHist = [];
    return null;
  }

  // Maintain a rolling 50-bar history of bandwidth in state to compute its own average.
  const s = ctx.state;
  if (!Array.isArray(s.bwHist)) s.bwHist = [];
  s.bwHist.push(bw);
  if (s.bwHist.length > 50) s.bwHist.shift();

  let wideBand = false;
  if (s.bwHist.length >= 50) {
    const avg = s.bwHist.reduce((a, b) => a + b, 0) / s.bwHist.length;
    wideBand = bw > avg; // current band wider than its recent average = vol expansion
  }

  if (pos > 0) {
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    // Full-cash flush only on a WIDE band (real dislocation). Quiet grinds get skipped.
    if (!wideBand) return null;
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
