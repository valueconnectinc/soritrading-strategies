/*
 * @coinsori-strategy v1
 * name: SOL Defensive Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sharp panic sell-offs in crypto often overshoot and snap
 * back. Buying only at the very bottom of the Bollinger band when RSI is
 * deeply oversold, and ONLY while price is still above the long-term 200-day
 * average, catches the rebound while staying out of real bear markets.
 * When it buys and sells: Buys when price touches the lower Bollinger band
 * (20,2) AND RSI(14) is below 30 AND price is above the 200-day average.
 * Sells when price climbs back above the 20-day average, OR immediately if
 * price falls below the 200-day average (cuts losses fast in a real crash).
 * When it does NOT work: In a genuine long bear market the trend gate keeps us
 * in cash (no loss but no return), and in a melt-up the oversold entries are
 * rare so it lags holding the asset the whole way up.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const r = ctx.rsi(14, 1);
  const ma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  if (bb == null || r == null || ma200 == null || ema20 == null) return null;

  const px = ctx.price;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;

  if (ctx.position === 0) {
    // deep oversold at the bottom band, but only while above the long-term trend
    if (prevClose > ma200 && prevClose <= bb.lower && r < 30) {
      return { side: 'buy', qty: ctx.cash / px * 0.98 };
    }
    return null;
  }

  // hard stop: if price breaks below the 200-day average, get out fast
  if (prevClose < ma200) {
    return { side: 'sell', qty: ctx.position };
  }
  // normal exit: price recovered back above the 20-day average
  if (prevClose > ema20) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
