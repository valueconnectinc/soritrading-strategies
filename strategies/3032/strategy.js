/*
 * @coinsori-strategy v1
 * name: Multi-Asset Squeeze-Breakout Basket 7-Asset
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT, ADAUSDT, LTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive mean-reversion basket stays flat in straight-line
 * melt-ups (no flush to buy). This is the upside complement: it buys volatility EXPANSION
 * — when a Bollinger squeeze (bands very narrow) resolves with a close above the upper
 * band, in a rising 200-day average. Each of the 7 legs fires independently on its own
 * squeeze, so it diversifies across assets like the MR basket.
 * When it buys and sells: Buy when price closes above the upper Bollinger band after a
 * squeeze (bandwidth in the bottom 40% of its 100-day range) and the 200-SMA is rising.
 * Sell when price closes back below the 20-day EMA, or drops 2.5 ATR from the highest
 * close since entry.
 * When it does NOT work: In a flat/choppy regime bands rarely squeeze-then-break up, so it
 * trades little; in a deep bear the 200-SMA gate keeps it mostly flat (capital safe, low
 * upside). Drawdown is far higher than the MR basket because it rides momentum.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const bandWidth = (bb.upper - bb.lower) / ((bb.upper + bb.lower) / 2);

  // Squeeze detection: current bandwidth is in the bottom 40% of its recent 100-day range.
  // Compute the 100-day bandwidth history from closes via a rolling approximation.
  const hist = [];
  for (let i = 1; i <= 100; i++) {
    const b = ctx.bb(20, 2, i);
    if (b == null) continue;
    hist.push((b.upper - b.lower) / ((b.upper + b.lower) / 2));
  }
  if (hist.length < 60) return null;
  const min = Math.min.apply(null, hist);
  const max = Math.max.apply(null, hist);
  const range = max - min;
  const squeeze = range > 0 && (bandWidth - min) / range < 0.4;

  if (pos > 0) {
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    const trailStop = entry - 2.5 * atr;
    if (price < ema20 || price < trailStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Buy on a squeeze that breaks out above the upper band.
  if (squeeze && price > bb.upper) {
    const legCash = ctx.cash;
    const riskEq = 0.02 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
