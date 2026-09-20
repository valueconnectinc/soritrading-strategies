/*
 * @coinsori-strategy v1
 * name: BTC Trend Ride + Conditional CrashStop 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SMA200+0.3ATR trend-ride is the validated BTC champion,
 * but its one known weakness is that the slow SMA exits late in sharp crashes.
 * This adds a conditional crash-stop that only fires when price has ALREADY
 * broken below the 200-SMA (trend broken) and then drops 3x ATR in 3 bars — so
 * it never whipsaws out in a bull pullback where price stays above the SMA.
 * When it buys and sells: same as the champion (long on cross above SMA200+0.3ATR,
 * exit on cross below SMA200-0.3ATR), plus an emergency exit when the trend is
 * broken and a fast 3x ATR drop confirms the crash.
 * When it does NOT work: the same sideways-chop whipsaw as the champion; and if a
 * crash is a slow grind (not a fast 3x ATR drop) the crash-stop won't trigger.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const atr = ctx.atr(14, 1);
  const atrP = ctx.atr(14, 2);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  const band = atr != null ? 0.3 * atr : 0;

  if (pos <= 0) {
    if (closePrev2 <= smaP + band && closePrev > sma + band) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const risk = 0.02 * cash;
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // normal trend exit
    if (closePrev < sma - band) {
      return { side: 'sell', qty: pos };
    }
    // conditional crash-stop: only when trend already broken (below SMA) AND fast 3x ATR drop
    if (closePrev < sma && atrP != null && atrP > 0) {
      const drop = (closePrev2 - closePrev) / atrP;
      if (drop > 3) {
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }
}
