/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (Hashrate Gate)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contracting
 * below its own recent average) is followed by a sharp expansion move. Betting
 * on the expansion side of the squeeze, confirmed by a volume surge, captures
 * the start of new directional trends. Running on TWO large-cap majors keeps
 * capital working when one symbol is quiet. A network-hashrate regime gate
 * (fundamental health) filters out breakouts that occur while miners are
 * leaving the network, on top of the 200-day price trend gate.
 * When it buys and sells: on each symbol, buys when band-width is below its
 * 20-bar average AND price closes above the upper Bollinger band AND volume
 * > 1.5x its 20-day average AND price is above the 200-day SMA AND hashrate is
 * not falling (30-day average >= its prior 30-day level). Exits on a 2.5x-ATR
 * stop or a 20-day low trail.
 * When it does NOT work: it deliberately stays out of deep bear markets (price
 * below the 200-day SMA), so it gives up the early bounce of a new bull run
 * that starts below the long average; choppy sideways markets where a squeeze
 * resolves with a failed breakout; and if the hashrate dataset is unavailable
 * the gate disables and it behaves like the plain 200-SMA version.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || atr == null || vol == null || avgVol == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // only enter the long-term bull regime (price above the 200-day average)
  if (price <= sma200) return null;

  // fundamental gate: skip entries while network hashrate is falling
  const hr30 = ctx.data('hashrate_sma30');
  const hr = ctx.data('hashrate');
  if (hr30 != null && hr != null && hr < hr30) return null;

  const bw = (bb.upper - bb.lower) / bb.middle;
  let sum = 0, cnt = 0;
  for (let k = 1; k <= 20; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    sum += (b.upper - b.lower) / b.middle;
    cnt++;
  }
  if (cnt < 20) return null;
  const avgBw = sum / cnt;
  if (bw >= avgBw) return null;

  if (vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
