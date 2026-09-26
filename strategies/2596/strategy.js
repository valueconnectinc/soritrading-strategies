/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion LTC 4H ScaleOut LooseStop
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: LTC 4h mean reversion — buy panic-bottoms at the lower
 * Bollinger band with RSI<30, above the 200-SMA, sell the snap-back. This
 * variant adds PARTIAL SCALE-OUT (sell half at the middle band) while KEEPING
 * the original loose 6x ATR stop, to isolate whether scale-out alone improves
 * the risk profile without sacrificing the upside.
 * When it buys and sells: buys below lower BB(20,2) + RSI<30 above SMA200;
 * sells half at mid-band/RSI>50, rest at upper band, or 6x ATR stop.
 * When it does NOT work: lags strong melt-ups; never buys below the 200-SMA;
 * a panic that keeps falling still loses. Defensive, not a trend rider.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    // Keep the original loose 6x ATR stop — LTC 4h is volatile enough that a
    // tighter stop gets hit on noise before the mean reversion completes.
    if (atr != null && price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
    // Partial scale-out: sell half at the middle band or when RSI turns neutral.
    if (price >= bb.mid || rsi > 50) {
      return { side: 'sell', qty: pos * 0.5 };
    }
    if (price >= bb.upper) return { side: 'sell', qty: pos };
    return null;
  }

  if (price < sma200) return null;
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
