/*
 * @coinsori-strategy v1
 * name: BTC Funding-OI Contrarian 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crowding/leverage data (funding rate + open interest) is a
 * genuinely different signal family from price-only indicators. When shorts are
 * extremely crowded (deeply negative funding), a short-squeeze tends to follow;
 * when longs are extremely crowded (very high funding), a long-squeeze can follow.
 * This bets on mean-reversion of crowded positioning rather than of price itself.
 * When it buys and sells: buys when funding turns deeply negative (shorts crowded)
 * with open interest confirming, and price is above its 100-EMA (avoid catching a
 * true crash); sells when price recovers to the 20-EMA or funding normalizes.
 * When it does NOT work: if the funding/OI feed is sparse or unavailable in backtest
 * this stays in cash (no trades); in a prolonged one-way crash even crowded shorts
 * keep losing, so the 100-EMA gate keeps it out of the worst of it.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema100 = ctx.ema(100, 1);
  if (ema20 == null || ema100 == null) return null;

  const pos = ctx.position;
  const st = ctx.state;

  // Exit: price back above the 20-EMA (mean reversion complete) or funding turned
  // strongly positive again (crowd flipped back to long).
  if (pos > 0) {
    if (price > ema20) {
      return { side: 'sell', qty: pos };
    }
    const f = ctx.funding;
    if (Number.isFinite(f) && f > 0.0005) { // funding back to normal/positive = exit
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: extreme short crowding. funding deeply negative (shorts paying to stay short).
  const f = ctx.funding;
  const oi = ctx.binanceOi();
  // Guard: if funding/OI data is not available (null), stay flat — do not force a trade.
  if (!Number.isFinite(f) || !Number.isFinite(oi)) return null;

  // Trend gate: only buy when above the 100-EMA so we don't catch a real crash.
  if (price <= ema100) return null;

  // Deeply negative funding = shorts crowded = squeeze fuel. 0.0005 = 0.05% per 8h.
  if (f < -0.0005 && price > ema20) {
    st.lastEntry = ctx.candle ? ctx.candle.time : ctx.i;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
