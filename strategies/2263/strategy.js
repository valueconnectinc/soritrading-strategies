/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout SMA200 Gate 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Donchian 55/30 daily breakout is our most validated edge
 * (positive on BTC, ETH, DOGE across walk-forward windows), but it whipsaws badly in
 * bear/choppy windows — BTC W1 2017 only returned +8% vs +52% hold. This adds a
 * 200-day SMA regime gate: only take a 55-day breakout when price is already above the
 * 200-day SMA, i.e. the long-term trend is up. This is an all-or-nothing FILTER, not a
 * size cap — it blocks entries in confirmed downtrends but keeps full size in bulls,
 * unlike the failed ATR-sizing overlay that capped the big wins.
 * When it buys and sells: buy when close breaks the 55-day high AND close > 200-day SMA;
 * sell when close drops below the 30-day low.
 * When it does NOT work: in a fresh bull that starts from deep below the 200-day SMA
 * (the gate keeps you out of the very first leg of a new bull), and in long sideways
 * chop around the SMA where the gate flips.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 210) return null;

  const closePrev = closes[closes.length - 2];
  if (closePrev == null) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  let entryHigh = -Infinity;
  for (let k = 2; k <= 56; k++) {
    const h = ctx.high(1, k);
    if (h == null) return null;
    if (h > entryHigh) entryHigh = h;
  }
  let exitLow = Infinity;
  for (let k = 2; k <= 31; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < exitLow) exitLow = l;
  }

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    // regime gate: only buy breakouts in an uptrend (close above 200-day SMA)
    if (closePrev > entryHigh && closePrev > sma200) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
