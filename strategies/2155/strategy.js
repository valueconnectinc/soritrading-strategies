/*
 * @coinsori-strategy v1
 * name: ETH 1H Channel Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: a turtle-style channel breakout. Price breaking above the
 * highest close of the last 20 hours signals a fresh burst of buying that often
 * continues. This is a momentum/breakout family, different from both the slow
 * 200-SMA trend ride and the mean-reversion strategies. It tries to catch the
 * explosive first leg of a move that slow trends enter too late.
 * When it buys and sells: buy when the close pierces the highest close of the
 * last 20 hours and volume is above average. Sell when price falls 2.5x ATR
 * below the highest price reached since entry (a trailing stop), so winners
 * ride while losers are cut quickly.
 * When it does NOT work: in choppy sideways markets most breakouts are false and
 * the trailing stop locks in a string of small losses (whipsaw). It needs real
 * trending bursts to pay for the false signals.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  const n = 20;
  if (closes.length < n + 3) return null;

  const closePrev = closes[closes.length - 2];
  let high20 = -Infinity;
  for (let k = 3; k <= n + 2; k++) {
    const c = closes[closes.length - k];
    if (c != null && c > high20) high20 = c;
  }
  if (high20 <= 0) return null;

  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (atr == null || vol == null || avgVol == null || avgVol <= 0) return null;

  const pos = ctx.position;
  const cash = ctx.cash;
  const price = ctx.price;
  const st = ctx.state || {};

  if (pos <= 0) {
    // clean breakout: close above the 20-bar high with above-average volume
    if (closePrev <= high20 || vol < avgVol) return null;
    const risk = 0.02 * cash;
    if (atr <= 0) return { side: 'buy', qty: (cash / price) * 0.9 };
    const riskQty = risk / atr;
    const maxQty = (cash / price) * 0.9;
    // remember the entry level so we can detect a failed breakout
    return { side: 'buy', qty: Math.min(riskQty, maxQty) };
  } else {
    // track the highest close since entry for the trailing stop
    const peak = st.peak != null ? Math.max(st.peak, closePrev) : closePrev;
    const stop = peak - 2.5 * atr;
    if (closePrev < stop || closePrev < high20) {
      ctx.state = { peak: null };
      return { side: 'sell', qty: pos };
    }
    ctx.state = { peak: peak };
    return null;
  }
}
