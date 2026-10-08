/*
 * @coinsori-strategy v1
 * name: BNB 1D Funding-Gated Momentum (mild)
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the momentum core (90d return + 200-day average) is the validated
 * champion. This version tests a NEW axis — funding-rate crowding. The previous test
 * used a strict 0.05%/8h threshold and improved the recent window (+181 vs +166) but
 * hurt the middle window by skipping strong entries. This milder version only blocks
 * truly extreme crowding (0.1%/8h), hoping to keep the middle-window gains while still
 * dodging the worst 2022 leverage unwind.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is above the
 * 200-day average, and funding is below 0.1%/8h (not extremely crowded). Sells when
 * momentum fades below +5% or price breaks the 200-day average.
 * When it does NOT work: if funding is missing in backtest it silently falls back to the
 * plain momentum core; in a sustained bull with persistently high funding the filter
 * can still skip the strongest leg.
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

  // 0.001 = 0.1% per 8h ≈ 33%/yr — truly crowded, the 2021-22 blow-off regime.
  const funding = ctx.funding;
  const crowded = (typeof funding === 'number' && Number.isFinite(funding)) ? funding > 0.001 : false;

  const pos = ctx.position;
  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !crowded) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
