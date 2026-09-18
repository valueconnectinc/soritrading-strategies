/*
 * @coinsori-strategy v1
 * name: BTCUSDT 4H BB Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when BTC 4H price drops below the lower Bollinger Band (2 std, 20 period)
 * with above-average volume — extreme oversold. Sell when price crosses back
 * above the middle band (the mean reversion target).
 * Why: BTC is mean-reverting at the 4H timeframe — extreme moves above/below
 * BB often correct within 4-8 bars. Volume confirms the oversold move is real.
 * When it buys and sells: Enter on close below lower BB + volume surge.
 * Exit when price crosses back above the middle BB line.
 * When it does NOT work: In strong sustained trends, price stays below the
 * lower band for extended periods (May 2021, Nov 2022 crashes). The exit
 * catches a falling knife. Works best in choppy/range-bound BTC.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 0);
  const vol20 = ctx.avgVol(20);
  if (bb == null || vol20 == null) return null;

  const price = ctx.price;
  const vol = ctx.vol;
  if (vol == null) return null;

  const mid = bb.middle; // 20-period SMA

  // === ENTRY: close below lower BB + volume confirmation ===
  // Volume must be 1.3x the 20-bar average — confirms institutional selling
  const inPosition = ctx.position > 0;

  if (!inPosition && price < bb.lower && vol > vol20 * 1.3) {
    // Stop loss: 2x ATR below entry
    const atr = ctx.atr(14);
    const stopPx = atr != null ? price - atr * 2 : price * 0.97;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      type: 'limit',
      price: price,
      trigger: { side: 'sell', qty: ctx.cash / price * 0.99, type: 'stop', price: stopPx }
    };
  }

  // === EXIT: price crosses back above middle BB (mean reversion complete) ===
  if (inPosition) {
    // Previous bar was below or at lower band
    const prevClose = ctx.closes[1]; // ago=1 = previous closed bar
    const prevBb = ctx.bb(20, 2, 1);
    if (prevClose != null && prevBb != null && prevClose <= prevBb.lower && price > mid) {
      return { side: 'sell', qty: ctx.position };
    }

    // Stop loss: 3x ATR from entry
    const atr = ctx.atr(14);
    if (atr != null && ctx.entryPx) {
      const stopPx = ctx.entryPx - atr * 3;
      if (price < stopPx) return { side: 'sell', qty: ctx.position };
    }

    // Time stop: max 12 bars (3 days) to avoid holding through extended drops
    if (!ctx.state.entryBar) ctx.state.entryBar = ctx.i;
    if (ctx.i - ctx.state.entryBar >= 12) {
      ctx.state.entryBar = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
