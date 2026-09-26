/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Panic-Bounce AVAX 4H
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family, but a distinct refinement of the
 * validated band-bounce champion. AVAX 4h overreacts to the downside, touches
 * the lower Bollinger band, then snaps back to the mean. The refinement: only
 * buy the panic-bottom when the dip comes on ELEVATED volume (genuine
 * capitulation / heavy selling), not a slow low-volume drift. A quiet bleed
 * down to the band is a falling knife; a high-volume flush is where the
 * snap-back live. This aims to cut the champion's falling-knife losses while
 * keeping its defensive snap-back edge.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30 above the 200-SMA AND the bar's volume is above its 20-bar
 * average (capitulation); exits at the middle band / RSI>50 or a 6-ATR stop,
 * then waits 5 bars before the next entry.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies);
 * in a sustained downtrend below the 200-SMA it never buys; a panic that keeps
 * falling still loses. Volume confirmation also means fewer trades, so it may
 * miss shallow dips that would have recovered. Mean reversion is defensive.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  // volume-confirmation: this bar's volume must exceed its 20-bar average
  const v = ctx.vol;
  const avgV = ctx.avgVol(20);
  if (v == null || avgV == null || avgV <= 0) return null;
  if (v < avgV) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
