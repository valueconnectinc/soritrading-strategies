/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (Risk-Sized + MACD Gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Combines the two best single improvements tested on the
 * validated ETH 4H squeeze-breakout. Risk-based sizing (2% of equity at risk
 * on the 2.5x-ATR stop) cut drawdown roughly in half in every walk-forward
 * window, and the MACD bullish-cross momentum gate improved capture in the
 * big melt-up window. Together they aim for the same defensive profile with
 * lower drawdown and slightly better trend capture than full-size buying.
 * When it buys and sells: buys when band-width is below its 20-bar average
 * AND price closes above the upper Bollinger band AND volume > 1.5x its
 * 20-bar average AND price is above the 200-bar SMA AND the MACD line is
 * above its signal. Position size risks 2% of equity on the 2.5x-ATR stop.
 * Exits on a 2.5x-ATR stop or a 20-bar low trail.
 * When it does NOT work: it deliberately stays out of deep bear markets
 * (below the 200-bar SMA), gives up the early bounce of a new bull run, and
 * lags the biggest melt-up rallies. Fixed 2% per-trade risk also caps upside
 * in strong trends.
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
    const riskPerCoin = atr * 2.5;
    const equity = ctx.cash + pos * price;
    const qty = (equity * 0.02) / riskPerCoin;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
