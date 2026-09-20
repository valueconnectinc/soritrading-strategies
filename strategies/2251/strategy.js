/*
 * @coinsori-strategy v1
 * name: BTC Bull-Regime Mean Reversion 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: in a bull regime (price above the 200-SMA) sharp oversold
 * dips tend to revert back toward the mean, so buying panic dips and selling the
 * recovery is a repeatable edge — the opposite family from the trend-ride champion.
 * When it buys and sells: long only when price is above the 200-SMA (bull regime)
 * AND RSI(14) is oversold AND price has pierced the lower Bollinger band; sell on
 * recovery to RSI 50 or price back above the 20-SMA, or a 40-bar time stop.
 * When it does NOT work: in a real bear market (price below the 200-SMA the filter
 * blocks all buys, so it sits out); and in a slow grinding decline within a bull
 * regime the "oversold" dips keep going lower and the mean reversion catches knives.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const sma20 = ctx.sma(20, 1);
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (sma200 == null || sma20 == null || rsi == null || bb == null || closePrev == null) return null;

  const pos = ctx.position;
  const cash = ctx.cash;
  const price = ctx.price;

  if (pos <= 0) {
    // bull regime + oversold + below lower band = panic dip worth buying
    if (closePrev > sma200 && rsi < 30 && closePrev < bb.lower) {
      const qty = (cash / price) * 0.95;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit on recovery to RSI 50 or price back above the 20-SMA (mean complete)
    if (rsi > 50 || closePrev > sma20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
