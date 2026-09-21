/*
 * @coinsori-strategy v1
 * name: BCH Donchian Breakout
 * ex: binance
 * syms: BCHUSDT
 * interval: 4h
 * cash: 1000
 *
 * Donchian channel breakout — a pure trend-following strategy. The mean-reversion
 * Band Bounce failed on BCH because BCH trends more than it mean-reverts, so it
 * needs a trend-following approach instead — the same family that works on
 * BTC/ETH/DOGE. Bet: when BCH breaks out of its recent range on the 4h chart, a
 * sustained move tends to follow; riding it with a trailing channel exit captures
 * the trend.
 * When it buys: price closes above the highest high of the last 55 bars (breakout).
 * When it sells: price closes below the lowest low of the last 30 bars (trend
 * exhausted) — the Donchian trailing exit.
 * When it does NOT work: choppy, range-bound regimes where breakouts are false
 * and immediately reverse (whipsaw); this strategy loses steadily in flat
 * markets and gives back gains in sharp reversals. It also lags the very start
 * of a new bull leg until the breakout confirms.
 */
function onUpdate(ctx) {
  const entryHi = ctx.high(55, 1); // highest high of last 55 bars ending at prev bar
  const exitLo = ctx.low(30, 1);   // lowest low of last 30 bars ending at prev bar
  if (entryHi == null || exitLo == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;

  if (pos === 0) {
    // Breakout: current close above the prior 55-bar high enters.
    if (px > entryHi) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // Exit: current close below the prior 30-bar low ends the trend.
  if (px < exitLo) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
