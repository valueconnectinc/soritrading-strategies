/*
 * @coinsori-strategy v1
 * name: SOL Gated Volume Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Big volume spikes usually mark a real move, but buying
 * them blindly in a downtrend catches falling knives. Restricting the breakout
 * to when the 200-day average is still rising keeps us on the right side of the
 * long-term trend and avoids the deep drawdowns of a plain breakout.
 * When it buys and sells: Buys only when price breaks a 20-bar high with 1.5x
 * volume AND the 200-day average is rising. Sells when price drops below the
 * 20-bar low.
 * When it does NOT work: It stays in cash during long bear markets (no return,
 * but no loss either), and it lags a melt-up that happens without volume spikes.
 */
function onUpdate(ctx) {
  const s20 = ctx.high(20, 1);
  const l20 = ctx.low(20, 1);
  const v = ctx.vol;
  const av = ctx.avgVol(20);
  const ma200 = ctx.sma(200, 1);
  const ma200prev = ctx.sma(200, 2);
  if (s20 == null || l20 == null || v == null || av == null || ma200 == null || ma200prev == null) return null;

  const px = ctx.price;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  const prevHigh = ctx.high(20, 2);
  const prevLow = ctx.low(20, 2);
  if (prevClose == null || prevHigh == null || prevLow == null) return null;

  // only buy when the long-term trend is rising (cuts drawdown in bears)
  const rising = ma200 > ma200prev;

  if (ctx.position === 0) {
    if (rising && prevClose > prevHigh && v > av * 1.5) {
      return { side: 'buy', qty: ctx.cash / px * 0.98 };
    }
    return null;
  }

  if (prevClose < prevLow) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
