/*
 * @coinsori-strategy v1
 * name: BTC 1D Macro-Regime Dollar Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A completely different signal family from the price-action champion.
 * It uses the US Dollar Index (DXY) as a macro risk-on/risk-off gate for BTC. A falling
 * dollar (weak USD) historically supports risk assets including crypto; a rising dollar
 * is a headwind. We only hold BTC long when the dollar is falling AND price is above its
 * 200-day average — a macro + trend confirmation from two independent sources.
 * When it buys and sells: Buy when price is above the 200-day average AND the dollar is
 * falling (DXY below its own 20-day average). Sell when price closes below the 200-day
 * average OR the dollar turns up (DXY rises above its 20-day average).
 * When it does NOT work: If DXY macro data is unavailable this strategy sits flat (no
 * trades). It misses strong BTC rallies that happen during dollar strength (e.g. some
 * 2020-21 phases where BTC rose alongside a firm dollar). The macro gate can also be
 * laggy — DXY moves slowly, so it may keep us out at the start of a rally.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (sma200 == null || sma200prev == null) return null;

  // Read the US Dollar Index macro series.
  const dxy = ctx.macro('dxy');
  if (dxy == null) return null;
  const dxyVal = (typeof dxy === 'object') ? (dxy.value != null ? dxy.value : dxy.close) : dxy;
  if (!Number.isFinite(dxyVal) || dxyVal <= 0) return null;

  // Dollar trend: falling if DXY is below its own slow average. Use a long window
  // (60d) so we only flip on a meaningful dollar trend, not daily noise.
  const dxySma = ctx.state.dxySma != null ? ctx.state.dxySma : dxyVal;
  ctx.state.dxySma = dxySma * 0.98 + dxyVal * 0.02;
  const dollarFalling = dxyVal < dxySma;

  const pos = ctx.position;

  if (pos > 0) {
    // Exit when the long-term trend turns down OR the dollar turns up.
    if (price < sma200 || sma200 < sma200prev || !dollarFalling) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Buy only in a rising trend AND a falling dollar (two independent confirmations).
  if (price > sma200 && sma200 > sma200prev && dollarFalling) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
