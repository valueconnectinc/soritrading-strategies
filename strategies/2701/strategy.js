/*
 * @coinsori-strategy v1
 * name: Trend-Ride Pullback ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH trends in sustained multi-month waves. This rides
 * confirmed uptrends only — entering on a genuine pullback below the 20-EMA
 * that reclaims it, while the 50-EMA is rising and price is above the 200-SMA —
 * and exits on a trend break. It is the bull-capturing complement to the
 * defensive band-bounce champion, which lags strong melt-ups.
 * When it buys and sells: buys when price dips at least 0.5 ATR below the
 * 20-EMA in a confirmed uptrend (50-EMA above 200-SMA, 20-EMA rising over 3
 * bars) then closes back above it; sells when price closes below the 50-EMA
 * or hits a 3-ATR stop; waits 40 bars before re-entry.
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

  // longer cooldown to kill re-entry churn
  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 40) return null;

  // only long in a confirmed uptrend: 50>200 and 20-EMA rising over 3 bars
  if (ema50 <= ema200) return null;
  const ema20_2 = ctx.ema(20, 2);
  const ema20_3 = ctx.ema(20, 3);
  if (ema20_2 == null || ema20_3 == null) return null;
  if (!(ema20 > ema20_2 && ema20_2 > ema20_3)) return null;

  // genuine pullback: prev bar closed >=0.5 ATR below 20-EMA, current reclaims
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;
  const dipped = prevClose <= ema20 - atr * 0.5;
  if (!dipped) return null;
  if (price <= ema20) return null;

  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
}
