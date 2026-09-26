/*
 * @coinsori-strategy v1
 * name: Volume-Surge Breakout BTC 4H ATR3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC 4h volume-surge breakout — buy a 20-bar high break
 * confirmed by >1.5x average volume. The volume filter cuts false breakouts
 * that plain Donchian suffers. This is the one promising non-mean-reversion
 * family. Exit uses a 3x ATR trailing stop with a 20-bar-low backstop to lock
 * in gains. Testing ATR multiplier sensitivity (2x/3x/4x).
 * When it buys and sells: buys when the close breaks the prior 20-bar high on
 * >1.5x average volume. Sells when price closes 3x ATR below its highest close
 * since entry, or below the 20-bar low.
 * When it does NOT work: whipsaws in sideways chop where volume spikes produce
 * false breakouts; loses in sustained bears. Asset-specific — failed to
 * generalize to ETH.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;

  const hi20 = ctx.high(20, 1);
  const atr = ctx.atr(14, 1);
  const avgVol = ctx.avgVol(20);
  if (hi20 == null || atr == null || avgVol == null) return null;
  const vol = ctx.vol;
  if (vol == null) return null;

  if (pos > 0) {
    // Track highest close since entry for the ATR trailing stop.
    const hi = Math.max(ctx.state.hi || ctx.entryPx || price, price);
    ctx.state.hi = hi;
    // Exit on 3x ATR trail below the high, or the 20-bar-low backstop.
    if (price <= hi - atr * 3 || price <= hi20) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // Buy on a 20-bar-high break with >1.5x average volume confirmation.
  if (price > hi20 && vol > avgVol * 1.5) {
    ctx.state.hi = price;
    ctx.state.lastExit = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
