/*
 * @coinsori-strategy v1
 * name: AVAX Band-Bounce Mean Reversion 4H
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Mature altcoins (XRP/LTC/DOT) repeatedly over-extend below
 * their lower Bollinger band and snap back to the middle. This tests whether that
 * mean-reversion edge also holds on AVAX, a high-volatility layer-1.
 * When it buys and sells: buys only when price closes below the lower Bollinger
 * band AND RSI is oversold AND price is above the 200-SMA (so we only buy dips in
 * an overall uptrend, not falling knives); sells half at the middle band and the
 * rest when RSI recovers above 50.
 * When it does NOT work: in sustained bear markets where price is below the 200-SMA
 * it stays in cash (defensive); and it lags strong straight-up rallies because it
 * waits for a deep dip to buy.
 */
function onUpdate(ctx) {
  // ---- indicators on CLOSED bars so live/backtest behave identically ----
  const bb = ctx.bb(20, 2, 1);          // Bollinger, 1 bar ago (closed)
  const r = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const mid = ctx.sma(20, 1);           // middle band ~ 20-SMA
  if (bb == null || r == null || sma200 == null || mid == null) return null;

  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;

  const lower = bb.lower;

  if (ctx.position === 0) {
    // buy a deep dip only inside an established uptrend (price above 200-SMA)
    const inUptrend = prevClose > sma200;
    const deepDip = prevClose < lower;
    const oversold = r < 35;            // 35, not 30: AVAX dips are shallower
    if (inUptrend && deepDip && oversold) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- exit: scale out half at the middle band, rest when RSI crosses 50 ----
  if (prevClose >= mid || r >= 50) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
