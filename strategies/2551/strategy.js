/*
 * @coinsori-strategy v1
 * name: OI Funding Sentiment Contrarian BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different data axis from the price/fear-greed
 * champion — derivatives positioning. When leveraged longs get crowded (funding
 * high + open interest rising) the market is fragile and prone to a long-squeeze
 * reversal; when shorts are crowded (funding low/negative + OI falling) a short-
 * squeeze bounce is likely. This bets on mean-reversion of positioning extremes.
 * When it buys and sells: buys when funding is low/negative AND open interest is
 * falling (crowded shorts -> bounce), sells/exits when funding turns very high
 * (crowded longs -> fragility). Position is volatility-targeted.
 * When it does NOT work: if funding/OI data is missing or too sparse on this
 * venue/symbol, the strategy never trades; in a one-way melt-up with persistently
 * high funding, the short-squeeze logic keeps it out of the strongest trend.
 */
function onUpdate(ctx) {
  const oi = ctx.binanceOi();
  const atr = ctx.atr(14, 1);
  if (oi == null) return null;
  if (atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Log what binanceOi actually returns so we can see the data shape.
  ctx.log('OI shape:', typeof oi, JSON.stringify(oi).slice(0, 200));

  if (pos > 0) {
    // Exit when funding turns very high -> crowded longs, reversal risk.
    const f = oi.funding;
    if (f != null && f > 0.001) return { side: 'sell', qty: pos };
    // hard stop
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  const f = oi.funding;
  const o = oi.oi;
  if (f == null || o == null) return null;

  // Crowded shorts bounce: funding low/negative and OI falling.
  if (f < 0.0001 && o < 0) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
