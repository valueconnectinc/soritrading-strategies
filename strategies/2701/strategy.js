/*
 * @coinsori-strategy v1
 * name: SOL Trend-Ride Pullback 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL trends hard but whipsaws on fast crossovers. This
 * rides confirmed uptrends only — entering on a genuine pullback below the
 * 20-EMA that reclaims it, while the 50-EMA is rising and price is above the
 * 200-SMA — and exits on a trend break. It is the bull-capturing complement
 * to the defensive band-bounce champion, which lags strong melt-ups.
 * When it buys and sells: buys when price dips below the 20-EMA in a confirmed
 * uptrend (50-EMA above 200-SMA) then closes back above it; sells when price
 * closes below the 50-EMA or hits a 3-ATR stop; waits 20 bars before re-entry.
 * When it does NOT work: in choppy/sideways regimes the pullback entries
 * whipsaw and give back gains; a sharp reversal that breaks the 50-EMA
 * immediately still takes the stop. Trend-following, not a dip buyer.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || ema200 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // exit: trend broke (close below 50-EMA) or stop hit
    if (price < ema50 || price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // cooldown after exit to avoid churn
  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 20) return null;

  // only long in a confirmed uptrend
  if (ema50 <= ema200) return null;

  // genuine pullback: prev bar closed below 20-EMA, current closes back above
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;
  const pulledBack = prevClose < ema20 && price > ema20;
  if (!pulledBack) return null;

  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
}
