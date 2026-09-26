/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (Risk-Sized)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same validated squeeze-breakout recipe as the baseline
 * ETH 4H strategy. The one change is risk-based position sizing: instead of
 * buying ~99% of cash every time, the position is sized so that the 2.5x-ATR
 * stop-loss risks a fixed 2% of current equity. In high-volatility regimes
 * (large ATR) the position is smaller and in calm regimes larger, which
 * normalizes risk per trade and should cut the worst drawdowns without
 * changing the entry or exit logic that was already validated.
 * When it buys and sells: buys when band-width is below its 20-bar average
 * AND price closes above the upper Bollinger band AND volume > 1.5x its
 * 20-bar average AND price is above the 200-bar SMA. Position size = the
 * coins whose 2.5x-ATR stop equals 2% of equity. Exits on a 2.5x-ATR stop
 * or a 20-bar low trail.
 * When it does NOT work: it deliberately stays out of deep bear markets
 * (below the 200-bar SMA), gives up the early bounce of a new bull run, and
 * lags the biggest melt-up rallies because it leaves the position on the
 * 20-bar trail. Risk-sizing also caps the upside in strong trends by keeping
 * per-trade risk fixed.
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

  if (vol > avgVol * 1.5 && price > bb.upper) {
    // risk 2% of equity on a 2.5x-ATR stop: qty = (equity * 0.02) / (atr * 2.5)
    const riskPerCoin = atr * 2.5;
    const equity = ctx.cash + pos * price;
    const qty = (equity * 0.02) / riskPerCoin;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
