/*
 * @coinsori-strategy v1
 * name: Donchian Trend-Following ETH 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Trend-following family (complement to the mean-reversion
 * champion). ETH has strong sustained multi-week trends; breaking to a 55-day
 * high signals a new uptrend leg that tends to persist. Buying the breakout and
 * riding until a 30-day low exit captures the trend. Ledger shows this family
 * works on daily bars (ADA +409%) but whipsaws on 4h — daily is the right frame.
 * When it buys and sells: buys when price closes above the highest high of the
 * last 55 days; sells when price closes below the lowest low of the last 30 days.
 * When it does NOT work: in a choppy range-bound market it buys late tops and
 * exits early, churning fees; drawdowns are large (60-75%) because it holds
 * through full trend reversals. Trend-following is high-risk, not defensive.
 */
function onUpdate(ctx) {
  const entry = ctx.high(55, 1);
  const exit = ctx.low(30, 1);
  if (entry == null || exit == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit: close below the 30-day low — trend has broken down.
    if (price < exit) return { side: 'sell', qty: pos };
    return null;
  }

  // Entry: close above the 55-day high — new uptrend leg.
  if (price > entry) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
