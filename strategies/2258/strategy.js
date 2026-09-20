/*
 * @coinsori-strategy v1
 * name: ETH Donchian Daily Breakout ATR-Sized 55/30
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Donchian 55/30 daily breakout is validated on both BTC and ETH
 * (positive all 6 windows, beats buy-and-hold in the big bull). Its one weakness is high
 * drawdown (42-57%) from holding full notional through deep pullbacks. This variant keeps
 * the identical proven entry/exit but sizes each position by ATR risk (2% of cash risked
 * per ATR unit) so violent regimes use smaller positions, cutting drawdown without changing
 * the trade timing.
 * When it buys and sells: buy on a close above the prior 55-day high; sell on a close
 * below the prior 30-day low. Position size = 2% of cash / 14-day ATR, capped at 98%.
 * When it does NOT work: same as the base Donchian — underperforms buy-and-hold in
 * choppy windows and still holds through deep pullbacks; ATR sizing only trims size, it
 * does not change when it exits.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;

  const closePrev = closes[closes.length - 2];
  if (closePrev == null) return null;

  let entryHigh = -Infinity;
  for (let k = 2; k <= 56; k++) {
    const h = ctx.high(1, k);
    if (h == null) return null;
    if (h > entryHigh) entryHigh = h;
  }
  let exitLow = Infinity;
  for (let k = 2; k <= 31; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < exitLow) exitLow = l;
  }

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev > entryHigh) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const riskQty = (0.02 * cash) / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
