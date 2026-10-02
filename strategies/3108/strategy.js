/*
 * @coinsori-strategy v1
 * name: BTC 1D Bollinger Squeeze-Breakout (trend-gated)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: After a period of low volatility the Bollinger bands compress into a
 * "squeeze"; when price then breaks out of the tight band it often starts a fresh move.
 * This is a different family from the mean-reversion champion — it buys expansion rather
 * than dips. It is gated by a rising 200-day average so it only takes breakouts in an
 * established uptrend.
 * When it buys and sells: buy when the 20-day Bollinger band width is in its lowest 25% of
 * the last 100 days (squeeze) and price closes above the upper band (breakout), while the
 * 200-day average is rising; sell when price closes back below the 20-day middle band or
 * after a trend reversal.
 * When it does NOT work: in a flat/choppy market a squeeze breakout is often a false move
 * and whipsaws; in a bear market the rising-trend gate keeps it flat (safe but no upside).
 * A straight-line melt-up still lags buy-and-hold.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const bbPrev = ctx.bb(20, 2, 2);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (bb == null || bbPrev == null || sma200 == null || sma200prev == null) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit: close back below the 20-day middle band, or the long trend turns down.
    if (price < bb.mid || !uptrend) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Squeeze: current band width in the lowest quartile of the last 100 widths.
  const width = (bb.upper - bb.lower) / bb.mid;
  let wmin = Infinity, wmax = -Infinity;
  for (let a = 1; a <= 100; a++) {
    const b = ctx.bb(20, 2, a);
    if (b == null) continue;
    const w = (b.upper - b.lower) / b.mid;
    if (w < wmin) wmin = w;
    if (w > wmax) wmax = w;
  }
  if (!Number.isFinite(wmin) || wmax <= wmin) return null;
  const squeeze = width <= wmin + 0.25 * (wmax - wmin); // lowest quartile = compressed volatility

  // Breakout: close above the upper band while the band is still tight.
  if (squeeze && price > bb.upper && bbPrev.upper != null && bbPrev.lower != null) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
