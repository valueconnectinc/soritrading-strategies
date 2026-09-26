/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BNB 4H (Risk-Sized + MACD Gate)
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Exact transfer of the validated ETH 4H squeeze-breakout
 * champion recipe to BNB 4H, to test whether the low-volatility compression
 * breakout edge generalizes to a third major asset. Buys a Bollinger squeeze
 * (band-width below its own 20-bar average) that breaks out above the upper
 * band on strong volume, in a long-term bull regime, with a MACD momentum gate.
 * When it buys and sells: buys when band-width is below its 20-bar average AND
 * price closes above the upper Bollinger band AND volume > 1.5x its 20-bar
 * average AND price is above the 200-bar SMA AND MACD is bullish. Position size
 * risks 2% of equity on the 2.5x-ATR stop. Exits on a 2.5x-ATR stop or a
 * 20-bar low trail.
 * When it does NOT work: it stays out of deep bear markets (below the 200-bar
 * SMA), gives up the early bounce of a new bull run, and lags the biggest
 * melt-up rallies. Fixed 2% per-trade risk caps upside in strong trends.
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
