/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In strong up-trends prices keep making new highs — buying the breakout
 * and riding it with a wide trailing exit catches those moves. Opposite of the mean-reversion
 * dip-buyer: it earns in bull markets.
 * When it buys and sells: Buys when the daily close makes a new 90-day high while price is
 * above the 200-day average (uptrend only). Sells when the close makes a new 40-day low
 * (wide exit so normal bull pullbacks don't knock it out), or when a stop is hit.
 * When it does NOT work: In long sideways/choppy markets it gets whipsawed by false breakouts
 * and pays fees on many small losses. In a prolonged bear it stays out (200-day filter), so it
 * misses the bounce and trails buy-and-hold.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  const sma200 = ctx.sma(200, 1);
  const h90 = ctx.high(90, 2);
  const l40 = ctx.low(40, 2);
  const atr = ctx.atr(14, 1);
  const lastClose = ctx.closes.at(-2);

  if (sma200 == null || h90 == null || l40 == null || atr == null || lastClose == null) return null;

  const equity = cash + pos * price;
  const riskPct = 0.05;                // bigger risk budget to see if the edge exists at all
  const atrMult = 2.5;

  if (pos > 0) {
    const stopPx = ctx.state.stopPx;
    if (stopPx != null && price <= stopPx) {
      return { side: 'sell', qty: pos };
    }
    if (lastClose < l40) {
      return { side: 'sell', qty: pos };
    }
    const newStop = price - atrMult * atr;
    if (stopPx == null || newStop > stopPx) {
      ctx.state.stopPx = newStop;
    }
    return null;
  }

  if (lastClose > sma200 && lastClose > h90) {
    const stopPx = price - atrMult * atr;
    const riskPerCoin = price - stopPx;
    if (riskPerCoin <= 0) return null;
    let qty = (equity * riskPct) / riskPerCoin;
    const maxQty = (cash / price) * 0.99;
    if (qty > maxQty) qty = maxQty;
    if (qty <= 0) return null;
    ctx.state.stopPx = stopPx;
    return { side: 'buy', qty: qty };
  }
  return null;
}
