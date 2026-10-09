/*
 * @coinsori-strategy v1
 * name: Donchian Breakout BTC 4h
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC on the 4h chart frequently moves in sustained trends, and a close above the 20-bar high often marks the start of a new leg.
 * When it buys and sells: it buys when price closes above the highest high of the last 20 bars; it sells when price closes below the lowest low of those 20 bars (a trailing exit).
 * When it does NOT work: in sideways/choppy markets false breakouts pile up and give back most of the gains — this loses during range-bound regimes.
 */

function onUpdate(ctx) {
  // Donchian levels from CLOSED bars (ago=1) so the backtest matches live trading.
  const hh = ctx.high(20, 1);
  const ll = ctx.low(20, 1);
  if (hh == null || ll == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // --- exits first: the trailing stop is the 20-bar low ---
  if (pos > 0) {
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }

  // --- entry: close above the 20-bar high ---
  if (price > hh) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty };
  }
  return null;
}
