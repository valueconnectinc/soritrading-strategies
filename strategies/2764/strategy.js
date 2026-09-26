/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze Breakout ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A DIFFERENT family from the contrarian pullback champion.
 * This is a BREAKOUT strategy: it waits for a volatility squeeze (Bollinger
 * bands pinched narrow) and buys the breakout above the upper band, but only
 * when price is above the 200-SMA (no shorting into downtrends). Bet: after a
 * period of compressed volatility, the market tends to trend strongly.
 * When it buys and sells: buys when the Bollinger band width compresses below
 * its recent average (squeeze) AND price closes above the upper band, while
 * price > 200-SMA; sells on a 3x-ATR trailing stop or when price drops below
 * the 200-SMA. 5-bar cooldown.
 * When it does NOT work: in a sideways/choppy market the squeeze breakout
 * often fails and reverts; it lags buy-and-hold in strong melt-ups because it
 * waits for a squeeze signal. Defensive profile — protects in bear markets.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  if (pos > 0) {
    // Trailing stop: exit if price falls 3 ATR below the high since entry.
    const atr = ctx.atr(14, 1);
    const peak = ctx.state.peak || ctx.entryPx;
    ctx.state.peak = Math.max(peak, price);
    if (atr != null && price <= ctx.state.peak - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // Exit if price falls below the 200-SMA (trend broken).
    if (price < sma200) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price <= sma200) return null;

  // Detect a squeeze: Bollinger band width compressed below 60% of its 50-bar average.
  const bbNow = ctx.bb(20, 2, 1);
  const bbPrev = ctx.bb(20, 2, 51);
  if (bbNow == null || bbPrev == null || bbNow.upper == null || bbNow.lower == null) return null;
  const widthNow = bbNow.upper - bbNow.lower;
  const widthPrev = bbPrev.upper - bbPrev.lower;
  if (widthPrev <= 0) return null;
  if (widthNow > widthPrev * 0.6) return null;

  // Buy when price closes above the upper band (breakout from the squeeze).
  if (price >= bbNow.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
