/*
 * @coinsori-strategy v1
 * name: BTC 1D Momentum Hysteresis + Wide Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: same validated long-horizon momentum hysteresis (90-day ROC
 * entry + 200-day trend gate + hysteresis exit), plus a WIDE 15% trailing stop from
 * the 50-day high. The documented baseline weakness is late exit in fast V-reversals;
 * a wide stop (vs the failed 10%/30-day) protects only against major reversals and
 * does not whipsaw on normal daily dips.
 * When it buys and sells: Buy when the 90-day price change is above +20% AND price is
 * above its 200-day average. Sell when the 90-day change falls below +5%, price drops
 * below the 200-day average, or price falls 15% below its 50-day high.
 * When it does NOT work: in a long sideways/choppy market the slow signals whipsaw at
 * low frequency; in a slow grinding uptrend the wide stop rarely triggers but the
 * 90-day exit may still give back a late-trend reversal. No profit promised.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const peak = ctx.high(50, 1); // highest high of last 50 closed bars
  if (peak == null || peak <= 0) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91]; // 90 bars back
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  if (ctx.position > 0 && (roc90 < 5 || prevClose < sma200 || prevClose < peak * 0.85)) {
    return { side: 'sell', qty: ctx.position };
  }
  if (ctx.position === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
