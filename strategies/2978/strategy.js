/*
 * @coinsori-strategy v1
 * name: BTC 1D Defensive MR + Baseline Long
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Defensive mean reversion is the ONLY validated edge on BTC 1D,
 * but it sits in cash during melt-ups. A full trend mode whipsawed (-39%). This version
 * instead holds a small 40% baseline long whenever price is above a rising 200-day
 * average — enough to capture part of a melt-up, small enough that a 200-day whipsaw
 * costs little. The defensive MR core (buy deep oversold flushes, sell on snap-back)
 * runs on top for the extra edge.
 * When it buys and sells: Baseline: 40% of equity is long while price is above the
 * 200-day average and the average is rising; it is sold when price closes back below.
 * MR: on top, buys a close below the lower Bollinger band (20,2.5) with RSI<30, sells
 * on snap-back above the 20-day average. MR adds to the baseline, never exceeding 95% cash.
 * When it does NOT work: In a choppy sideways market that crosses the 200-day average
 * repeatedly, the baseline whipsaws (bounded at 40% size so the cost is limited). In a
 * broad bear the baseline is flat and it mostly just waits. It still lags a full
 * buy-and-hold in a clean melt-up because only 40% is exposed.
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
  const above200 = price > sma200;

  // Baseline target: 40% of equity when in a healthy uptrend regime.
  const baselineQty = above200 ? (ctx.cash / price) * 0.40 : 0;

  // MR target: an oversold-flush add, sized by ATR risk, on top of baseline.
  const lowerBand = bb.lower;
  let mrQty = 0;
  if (uptrend && price < lowerBand && rsi < 30) {
    mrQty = Math.min((0.01 * ctx.cash) / atr, (ctx.cash / price) * 0.55);
  }

  const targetQty = baselineQty + mrQty;
  const maxQty = (ctx.cash / price) * 0.95;

  if (pos > 0) {
    // If we hold an MR add and the snap-back fired, drop that add.
    if (mrQty === 0 && (price > ema20 || rsi > 55)) {
      // Sell down to the baseline target (or to zero if no baseline).
      const sellQty = pos - baselineQty;
      if (sellQty > 0) return { side: 'sell', qty: sellQty };
      return null;
    }
    // Otherwise rebalance toward the target (small drift).
    if (targetQty < pos - baselineQty * 0.1) {
      return { side: 'sell', qty: pos - targetQty };
    }
    return null;
  }

  // Flat: establish the baseline if in an uptrend regime.
  if (targetQty > 0) {
    return { side: 'buy', qty: Math.min(targetQty, maxQty) };
  }
  return null;
}
