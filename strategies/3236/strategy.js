/*
 * @coinsori-strategy v1
 * name: BNB 1D Funding-Gated Momentum
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the momentum core (90d return + 200-day average) is the validated
 * champion. This version tests a NEW axis — funding-rate crowding: when funding is very
 * positive, longs are paying heavily to stay long, the position is crowded and a
 * liquidation cascade can unwind the whole move (the 2022 bear was exactly that).
 * Skipping entries into a crowded long should cut the worst drawdowns.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is above the
 * 200-day average, and funding is not extremely positive (not crowded). Sells when
 * momentum fades below +5% or price breaks the 200-day average.
 * When it does NOT work: if funding data is missing in backtest it silently falls back
 * to the plain momentum core; in a sustained bull where funding stays elevated the
 * filter can wrongly skip the strongest leg of the trend.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // Funding rate per 8h. 0.0005 = 0.05% per 8h ≈ 4.5%/yr — the crowded-long threshold.
  const funding = ctx.funding;
  const crowded = (typeof funding === 'number' && Number.isFinite(funding)) ? funding > 0.0005 : false;

  const pos = ctx.position;
  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !crowded) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
