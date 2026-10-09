/*
 * @coinsori-strategy v1
 * name: TrendRide200
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's long-term trend is up, but it has brutal bear
 * drawdowns. A simple rule — stay long while price is above its 200-day
 * average, exit when the trend breaks — captures most of the bull while
 * sidestepping the worst of the bears.
 * When it buys and sells: buys when price closes above the 200-day average;
 * sells when price closes below the 50-day average (trailing exit) or drops
 * 25% below the entry (hard stop).
 * When it does NOT work: in a long sideways chop around the 200-day average it
 * whipsaws in and out of the market and pays fees; and the 50-day trailing exit
 * gives back part of every pullback before it re-enters.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (!closes || closes.length < 201) return null;
  const price = closes[closes.length - 1];
  if (!Number.isFinite(price) || price <= 0) return null;

  // manual SMA over closed bars (ago=1 equivalent)
  const sma200 = sma(closes, 200, 1);
  const sma50 = sma(closes, 50, 1);
  if (sma200 == null || sma50 == null) return null;

  const pos = ctx.position || 0;

  // cooldown: wait 3 bars after any order before acting again
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (cd > 0) return null;
    if (ctx.entryPx != null && price <= ctx.entryPx * 0.75) {
      ctx.state.cd = 3;
      return { side: 'sell', qty: pos };
    }
    if (price < sma50) {
      ctx.state.cd = 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (cd > 0) return null;
  if (price > sma200) {
    ctx.state.cd = 3;
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}

function sma(arr, n, ago) {
  const end = arr.length - 1 - ago;
  const start = end - n + 1;
  if (start < 0) return null;
  let sum = 0;
  for (let k = start; k <= end; k++) {
    const v = arr[k];
    if (!Number.isFinite(v)) return null;
    sum += v;
  }
  return sum / n;
}
