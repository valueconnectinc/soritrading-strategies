/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout SOL 1D (200-SMA Gate)
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated squeeze-breakout edge (low-volatility coiling
 * followed by a volume-confirmed expansion) that works on BTC+ETH 1D, applied to
 * SOL — a large-cap alt that tends to make even sharper directional moves than
 * BTC/ETH. Testing whether the edge generalizes to a third, more volatile asset.
 * When it buys and sells: buys when band-width is below its 20-bar average AND
 * price closes above the upper Bollinger band AND volume > 1.5x its 20-day
 * average AND price is above the 200-day SMA (long-term bull regime only).
 * Exits on a 2.5x-ATR stop or a 20-day low trail.
 * When it does NOT work: deep bear markets (below the 200-day SMA); SOL's high
 * volatility means squeezes resolve as false breakouts more often than on
 * BTC/ETH; SOL also has a shorter 1D history (listed 2020), so the 200-day gate
 * leaves fewer tradable bars in the early period.
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
