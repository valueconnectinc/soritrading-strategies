/*
 * @coinsori-strategy v1
 * name: SOL Uptrend RSI-Dip Mean Reversion 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: high-beta altcoins like SOL mean-revert hard — sharp
 * oversold dips inside a healthy uptrend tend to bounce back to the mean.
 * This buys those dips only when price is firmly ABOVE the 200-EMA (a strong
 * uptrend, so we never catch falling knives in a downtrend) and sells back at
 * the middle of the Bollinger band. This is the opposite family from the
 * trend-following BTC/ETH champions: it profits from mean reversion, not
 * trend persistence.
 * When it buys and sells: buy when price touches/crosses below the lower
 * Bollinger band AND RSI(14) < 35 AND price is above the 200-EMA AND volume
 * is above average. Sell when price returns to the middle band or RSI climbs
 * back above 60.
 * When it does NOT work: in a sustained downtrend the price-above-EMA filter
 * keeps it out (good), but it still gives up almost all upside in a parabolic
 * bull because it sells back at the mean instead of riding the trend; in chop
 * just above the EMA it can whipsaw.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const ema200 = ctx.ema(200, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.volPrev;
  if (bb == null || rsi == null || ema200 == null || avgVol == null || vol == null) return null;

  const closePrev = ctx.closes[ctx.closes.length - 2];
  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    // strong uptrend: price must be ABOVE the 200-EMA, not just EMA rising
    const inUptrend = closePrev > ema200;
    const oversold = rsi < 35 && closePrev <= bb.lower;
    const volOk = vol > avgVol * 1.1;
    if (inUptrend && oversold && volOk) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev >= bb.mid || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
