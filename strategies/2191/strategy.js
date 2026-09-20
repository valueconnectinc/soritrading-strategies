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
 * This buys those dips only when the long-term 200-EMA is rising (so we are
 * not catching falling knives in a downtrend) and sells back at the middle of
 * the Bollinger band. This is the opposite family from the trend-following
 * BTC/ETH champions: it profits from mean reversion, not trend persistence.
 * When it buys and sells: buy when price touches/crosses below the lower
 * Bollinger band AND RSI(14) < 35 AND the 200-EMA is rising AND volume is
 * above average (real selling, not a quiet drift). Sell when price returns to
 * the middle band or RSI climbs back above 60.
 * When it does NOT work: in a sustained downtrend the EMA filter keeps it out
 * (good), but in a choppy sideways market the 200-EMA flip-flops and it can
 * whipsaw; it gives up most of the upside in a parabolic bull because it
 * sells back at the mean instead of riding the trend.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);          // previous closed bar
  const rsi = ctx.rsi(14, 1);
  const ema200 = ctx.ema(200, 1);
  const ema200p = ctx.ema(200, 2);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.volPrev;              // previous bar volume
  if (bb == null || rsi == null || ema200 == null || ema200p == null || avgVol == null || vol == null) return null;

  const closePrev = ctx.closes[ctx.closes.length - 2];
  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    const emaRising = ema200 > ema200p;
    const oversold = rsi < 35 && closePrev <= bb.lower;
    const volOk = vol > avgVol * 1.1;
    if (emaRising && oversold && volOk) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit back at the mean: close above mid-band OR RSI recovered above 60
    if (closePrev >= bb.mid || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
