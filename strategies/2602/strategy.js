/*
 * @coinsori-strategy v1
 * name: Multi-Symbol Squeeze Breakout + Trend Rider BTC+ETH 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contraction to
 * a 100-day minimum) is followed by a sharp expansion move — betting on the
 * expansion side, confirmed by a volume surge, captures new trends. Its one
 * weakness was sitting in cash during strong bull runs and missing the melt-up.
 * This version adds a "trend-rider" mode: once in a confirmed uptrend (price
 * above the 50-day EMA and the 50-day above the 200-day), it stays invested with
 * a trailing stop so it rides the bull instead of waiting for the next squeeze.
 * Running on BTC and ETH means capital is not idle waiting for one symbol.
 * When it buys and sells: buy on a squeeze+volume+above-upper-band breakout, OR
 * re-enter on a pullback while a confirmed uptrend is intact. Exit on a 2.5x-ATR
 * stop, a 20-day low trail, or when the uptrend breaks (price under the 50-day
 * EMA) — the trend-break exit is what protects the bull-run gains.
 * When it does NOT work: choppy sideways markets where squeeze breakouts fail and
 * the trend-rider whipsaws on a weak uptrend; a late bull trap that fakes an
 * uptrend then reverses. The 50>200 EMA confirmation and trailing stop help but
 * cannot eliminate the whipsaw cost of trend riding.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  if (bb == null || atr == null || vol == null || avgVol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const trendUp = ema50 != null && ema200 != null && ema50 > ema200 && price > ema50;

  if (pos > 0) {
    // Hard stop: 2.5x ATR protects against a sudden reversal.
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    // Trailing exit: a 20-day low trail locks in gains as the trend matures.
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    // Trend-rider exit: if the confirmed uptrend breaks, take profits instead of
    // giving back the melt-up. This is the guard that fixes the old "sit in cash
    // during bull" weakness — we ride the bull but exit cleanly at its end.
    if (trendUp === false && ema50 != null && ema200 != null) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Squeeze: band width at a 100-day minimum.
  const bw = (bb.upper - bb.lower) / bb.middle;
  let minBw = bw;
  for (let k = 1; k <= 100; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    const w = (b.upper - b.lower) / b.middle;
    if (w < minBw) minBw = w;
  }
  const isSqueeze = bw <= minBw;

  // Trend-rider re-entry: pullback to the 50-day EMA while the uptrend holds.
  // This catches melt-up dips that the squeeze trigger would miss entirely.
  if (trendUp && ema50 != null && price <= ema50 * 1.02) {
    const size = Math.min(0.99, Math.max(0.3, 0.02 / (atr / price)));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }

  // Original squeeze breakout trigger: fresh squeeze + volume surge + above band.
  if (isSqueeze) {
    const volSurge = vol > avgVol * 1.5;
    const aboveBand = price > bb.upper;
    if (volSurge && aboveBand) {
      const size = Math.min(0.99, Math.max(0.3, 0.02 / (atr / price)));
      return { side: 'buy', qty: ctx.cash / ctx.price * size };
    }
  }
  return null;
}
