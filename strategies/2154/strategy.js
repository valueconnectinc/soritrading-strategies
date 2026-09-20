/*
 * @coinsori-strategy v1
 * name: ETH 1H Volatility Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: the slow 200-SMA trend ride is excellent at holding long
 * trends but it enters late and never catches the sharp explosive first leg of a
 * move. This is the opposite timing philosophy — a turtle-style breakout that
 * buys the moment price smashes through a recent high with rising volume and
 * expanding volatility, hoping to ride the initial burst. It is a different
 * family (breakout/momentum) from the mean-reversion and slow-trend strategies.
 * When it buys and sells: buy when the close breaks above the highest close of
 * the last 20 hours AND volume is above its recent average AND volatility (ATR)
 * is expanding. Sell on a trailing stop of 2x ATR from the highest price since
 * entry, or when the breakout fails and price falls back below the entry range.
 * When it does NOT work: in a choppy, sideways market breakouts are fake and get
 * stopped out repeatedly (whipsaw). It also loses when a breakout immediately
 * reverses — the stop locks in small losses. It needs real trending bursts to
 * pay for the many false signals.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  const n = 20;
  if (closes.length < n + 3) return null;

  const closePrev = closes[closes.length - 2];
  const closePrev2 = closes[closes.length - 3];
  // highest close of the last 20 bars, excluding the most recent two
  let high20 = -Infinity;
  for (let k = 3; k <= n + 2; k++) {
    const c = closes[closes.length - k];
    if (c != null && c > high20) high20 = c;
  }
  if (high20 <= 0) return null;

  const atr = ctx.atr(14, 1);
  const atrPrev = ctx.atr(14, 2);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (atr == null || atrPrev == null || vol == null || avgVol == null || avgVol <= 0) return null;

  const pos = ctx.position;
  const cash = ctx.cash;
  const price = ctx.price;

  if (pos <= 0) {
    // breakout: close above the 20-bar high, volume above average, ATR expanding
    const breakout = closePrev > high20 && vol > avgVol * 1.2 && atr > atrPrev * 1.05;
    if (!breakout) return null;
    // risk 1.5% of cash per trade, converted to coins via ATR
    const risk = 0.015 * cash;
    if (atr <= 0) return { side: 'buy', qty: (cash / price) * 0.9 };
    const riskQty = risk / atr;
    const maxQty = (cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(riskQty, maxQty) };
  } else {
    // trailing stop: 2x ATR below the running high since entry
    const entry = ctx.entryPx;
    if (entry == null) return null;
    const stop = entry - 2 * atr;
    // also exit if the breakout failed (price back below the breakout level)
    if (closePrev < stop || closePrev < high20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
