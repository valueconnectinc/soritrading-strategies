/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (Profit-Locked Trail + MACD Gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same validated ETH 4H squeeze-breakout entry as the
 * champion, but with a profit-locked trailing exit. The champion's 20-bar-low
 * trail gives back a lot in fast trends (the low can sit far below price).
 * This version adds an ATR trail that only activates once the trade is
 * meaningfully in profit, so it locks in gains without disturbing the
 * early-trade behavior that made the chandelier (trailing from entry) fail.
 * When it buys and sells: buys on a squeeze breakout (band-width below its
 * 20-bar average, close above the upper Bollinger band, volume > 1.5x its
 * 20-bar average, price above the 200-bar SMA, MACD above signal). Position
 * risks 2% of equity on the 2.5x-ATR stop. Exits on a 2.5x-ATR hard stop, or
 * once up 1.5x ATR, on a trailing stop at the higher of the 20-bar low and
 * (highest high since entry - 2.5x ATR).
 * When it does NOT work: stays out of deep bears (below 200-SMA), gives up
 * the early bounce of a new bull run, and lags the biggest melt-ups. The
 * profit-locked trail adds little in choppy, low-trend regimes.
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
    // hard stop: 2.5x ATR below entry
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    // profit-locked trail: only after the trade is up 1.5x ATR
    if (price > ctx.entryPx + atr * 1.5) {
      // highest high since entry, using recent bars
      let hh = price;
      for (let k = 1; k <= 20; k++) {
        const h = ctx.high(20, k);
        if (h == null) break;
        if (h > hh) hh = h;
      }
      const trail = hh - atr * 2.5;
      const ll20 = ctx.low(20, 1);
      const stop = ll20 != null ? Math.max(trail, ll20) : trail;
      if (price < stop) return { side: 'sell', qty: pos };
      return null;
    }
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
    const riskPerCoin = atr * 2.5;
    const equity = ctx.cash + pos * price;
    const qty = (equity * 0.02) / riskPerCoin;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
