/*
 * @coinsori-strategy v1
 * name: BTC Long-Short Trend (both directions)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The long-only champion sits flat in bear markets (capital-safe but
 * earns nothing). This is genuinely different: it trades BOTH directions on a clean
 * dual-EMA trend, so it can profit from the downtrends the champion ignores. It uses only
 * price data (fully testable here, unlike the OI/funding axes which returned no data).
 * When it buys and sells: Long when the fast EMA is above the slow EMA (trend up), short
 * when the fast EMA is below the slow EMA (trend down). Flat when the two are close
 * (no trend). Uses EMA50/EMA200 on BTC 1D.
 * When it does NOT work: In a choppy sideways market the crossover whipsaws and pays fees
 * on both sides. Shorting a violently-spiking asset like BTC carries sharp squeezes that
 * can hurt. A slow trend turn gives back gains before the crossover flips.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const emaFast = ctx.ema(50, 1);
  const emaSlow = ctx.ema(200, 1);
  if (emaFast == null || emaSlow == null) return null;

  const pos = ctx.position;

  // Long position: exit when trend turns down.
  if (pos > 0) {
    if (emaFast < emaSlow) return { side: 'sell', qty: pos };
    return null;
  }
  // Short position: exit (buy back) when trend turns up.
  if (pos < 0) {
    if (emaFast > emaSlow) return { side: 'buy', qty: -pos };
    return null;
  }

  // No position: enter in the direction of the trend.
  const equity = ctx.cash + ctx.uPnl;
  const base = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
  if (emaFast > emaSlow * 1.01) {
    return { side: 'buy', qty: base * 0.98 };
  }
  if (emaFast < emaSlow * 0.99) {
    return { side: 'sell', qty: base * 0.98 };
  }
  return null;
}
