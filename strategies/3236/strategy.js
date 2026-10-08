/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Crowded-Funding Exit
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the momentum core (90d return + 200-day average) is the validated
 * champion. The 2021 blow-off top and the 2022 crash were both leverage-unwind events —
 * when funding is extremely positive, longs are crowded and a cascade can unwind the
 * whole move. Exiting on extreme funding (instead of gating buys, which failed) aims to
 * lock in gains right before the unwind, cutting the champion's worst drawdown.
 * When it buys and sells: buys when 90-day momentum is above +20% and price is above
 * the 200-day average (unchanged from the champion). Sells when momentum fades below
 * +5%, price breaks the 200-day average, OR funding exceeds 0.1%/8h (crowded).
 * When it does NOT work: if funding is missing in backtest it falls back to the plain
 * champion; in a bull where funding stays high for months the exit can sell too early
 * and miss the final leg.
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

  // 0.001 = 0.1% per 8h ≈ 33%/yr — the crowded blow-off regime (2021-22).
  const funding = ctx.funding;
  const crowded = (typeof funding === 'number' && Number.isFinite(funding)) ? funding > 0.001 : false;

  const pos = ctx.position;
  if (pos > 0 && (roc90 < 5 || prevClose < sma200 || crowded)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
