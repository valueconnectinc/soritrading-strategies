/*
 * @coinsori-strategy v1
 * name: SOL Funding-Squeeze Long 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: when the crowd is heavily short (very negative funding) but the
 * long-term trend is still up, a short-squeeze pop is likely. This bets on that
 * positioning extreme rather than on price levels alone.
 * When it buys and sells: buys when funding is deeply negative AND price is above its
 * 100-day average (uptrend intact). Sells when funding turns positive or price falls
 * back below the 100-day average.
 * When it does NOT work: in a genuine bear market the "trend intact" gate keeps it out
 * (good), but in a sustained downtrend with persistently negative funding it never
 * enters and just holds cash. It also needs a real uptrend to exist, so it misses
 * chop and sideways markets.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const sma100prev = ctx.sma(100, 2);
  if (sma100 == null || sma100prev == null) return null;

  const funding = ctx.funding;   // current funding rate (null = unknown)
  const oi = ctx.binanceOi ? ctx.binanceOi() : null;

  // Roll previous-bar OI through ctx.state so we compare bars, not ticks.
  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    s.prevOi = s.curOi ?? null;
    s.lastBarI = ctx.i;
  }
  s.curOi = oi;

  const pos = ctx.position;

  if (pos > 0) {
    // Exit: crowd no longer short (funding >= 0) or the uptrend broke.
    if ((funding != null && funding >= 0) || price < sma100) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: deeply negative funding (crowd short) + uptrend intact.
  if (funding == null) return null;
  if (funding < -0.0005 && sma100 > sma100prev && price > sma100) {
    // OI confirmation: fresh shorts being added (OI rising), else fall back to funding alone.
    if (s.prevOi != null && oi != null && oi > s.prevOi) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    if (s.prevOi == null || oi == null) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
  }
  return null;
}
