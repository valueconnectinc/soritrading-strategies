/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (Vol-Adaptive Risk + MACD Gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same validated ETH 4H squeeze-breakout entry/exit as the
 * champion, but with volatility-regime adaptive position sizing. When the
 * market is calm (ATR in a low percentile) the same 2.5x-ATR stop risks less
 * capital per coin, so we can safely take a larger position; when volatility
 * spikes we cut size. This targets the champion's remaining drawdown in
 * volatile windows without changing the validated entry or exit.
 * When it buys and sells: buys on a squeeze breakout (band-width below its
 * 20-bar average, close above the upper Bollinger band, volume > 1.5x its
 * 20-bar average, price above the 200-bar SMA, MACD above signal). Position
 * size risks a volatility-adaptive budget (1-3% of equity) on the 2.5x-ATR
 * stop. Exits on a 2.5x-ATR stop or a 20-bar low trail.
 * When it does NOT work: it stays out of deep bears (below 200-SMA), gives up
 * the early bounce of a new bull run, and lags the biggest melt-ups. Adaptive
 * sizing adds no edge in a steady-volatility regime.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const sma200 = ctx.sma(200, 1);
  const macd = ctx.macd(12, 26, 9, 1);
  if (bb == null || atr == null || vol == null || avgVol == null || sma200 == null || macd == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // only enter the long-term bull regime (price above the 200-bar average)
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

  if (macd.macd > macd.signal && vol > avgVol * 1.5 && price > bb.upper) {
    // volatility-regime adaptive risk: calm = bigger size, volatile = smaller
    // rank current ATR among the last 100 ATR values -> percentile 0..1
    let under = 0, n = 0;
    for (let k = 1; k <= 100; k++) {
      const a = ctx.atr(14, k);
      if (a == null) break;
      if (a <= atr) under++;
      n++;
    }
    const pct = n > 0 ? under / n : 0.5;
    // risk budget maps percentile 0->3%, 1->1% (linear)
    const riskPct = 0.03 - pct * 0.02;
    const riskPerCoin = atr * 2.5;
    const equity = ctx.cash + pos * price;
    const qty = (equity * riskPct) / riskPerCoin;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
