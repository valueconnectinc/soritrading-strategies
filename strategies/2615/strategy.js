/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (10-Day Trail)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (band-width contracting below its
 * own recent average) is followed by a sharp expansion move. Betting on the
 * expansion side of the squeeze, confirmed by a volume surge, captures the
 * start of new directional trends. Two large-cap majors keep capital working
 * when one symbol is quiet.
 * When it buys and sells: buys when band-width is below its 20-bar average AND
 * price closes above the upper Bollinger band AND volume > 1.5x its 20-day
 * average AND price is above the 200-day SMA (long-term bull regime only).
 * Exits on a 2.5x-ATR stop or a 10-day low trail (tighter than the 20-day
 * baseline, to protect gains faster in choppy/volatile windows).
 * When it does NOT work: deep bear markets (below the 200-day SMA) — it gives
 * up the early bounce of a new bull run; choppy sideways markets where a
 * squeeze resolves with a failed breakout. The tighter 10-day trail exits
 * strong trends earlier than the 20-day baseline, so in straight-line bull
 * runs it may give back less but also capture less.
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
    // tighter 10-day low trail instead of the 20-day baseline
    const ll10 = ctx.low(10, 1);
    if (ll10 != null && price < ll10) return { side: 'sell', qty: pos };
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
