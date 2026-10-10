/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In strong up-trends prices keep making new highs — buying the 55-day
 * breakout and riding it with a trailing stop catches those moves. This is the opposite of
 * the mean-reversion dip-buyer: it earns in bull markets.
 * When it buys and sells: Buys when the daily close makes a new 55-day high while price is
 * above the 200-day average (uptrend only). Sells when the close makes a new 20-day low, or
 * when a 2x ATR stop is hit (stop trails up as price rises).
 * When it does NOT work: In long sideways/choppy markets it gets whipsawed by false breakouts
 * and pays fees on many small losses. In a prolonged bear it stays out (200-day filter), so it
 * misses the bounce and trails buy-and-hold.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  // ---- closed-bar reads only (identical in backtest/paper/live) ----
  const sma200 = ctx.sma(200, 1);        // long-term regime filter
  const h55 = ctx.high(55, 2);           // highest high of the prior 55 CLOSED bars
  const l20 = ctx.low(20, 2);            // lowest low of the prior 20 CLOSED bars
  const atr = ctx.atr(14, 1);            // current volatility for stops and sizing
  const lastClose = ctx.closes.at(-2);   // last CLOSED bar

  if (sma200 == null || h55 == null || l20 == null || atr == null || lastClose == null) return null;

  const equity = cash + pos * price;
  const riskPct = 0.015;                 // risk 1.5% of equity per trade -> bounded drawdown
  const atrMult = 2;                     // vol stop = 2x ATR (standard, survives most regimes)

  if (pos > 0) {
    const stopPx = ctx.state.stopPx;
    // hard stop hit
    if (stopPx != null && price <= stopPx) {
      return { side: 'sell', qty: pos };
    }
    // 20-day low break = trend over
    if (lastClose < l20) {
      return { side: 'sell', qty: pos };
    }
    // trail the stop up as price advances (never down)
    const newStop = price - atrMult * atr;
    if (stopPx == null || newStop > stopPx) {
      ctx.state.stopPx = newStop;
    }
    return null;
  }

  // ---- entry: new 55-day-high breakout, only in an uptrend ----
  if (lastClose > sma200 && lastClose > h55) {
    const stopPx = price - atrMult * atr;
    const riskPerCoin = price - stopPx;
    if (riskPerCoin <= 0) return null;
    let qty = (equity * riskPct) / riskPerCoin;
    const maxQty = (cash / price) * 0.99;   // never borrow
    if (qty > maxQty) qty = maxQty;
    if (qty <= 0) return null;
    ctx.state.stopPx = stopPx;
    return { side: 'buy', qty: qty };
  }
  return null;
}
