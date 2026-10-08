/*
 * @coinsori-strategy v1
 * name: 1D Multi-Asset Momentum Defensive Sizing
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: sizing up in strong momentum failed (bigger blow-off
 * drawdowns). But the recent window improved when the strategy was DEFENSIVE
 * in weak momentum. This version keeps the champion's entry and exit, and
 * only ever sizes DOWN: weak 90d momentum gets a smaller position, strong
 * momentum gets the champion's normal full position (never more). This keeps
 * the two big bull windows at champion strength while reducing exposure in
 * the choppy weak-trend phases that cost money.
 * When it buys and sells: buy BTC/ETH/SOL when 90d momentum > +20%, price
 * above the 200-day average, and the Fed is not hiking. Position is 50% of
 * the normal third when momentum is barely above the threshold, rising to
 * the full third at strong momentum. Sell when momentum fades below +5% or
 * price breaks the 200-day average.
 * When it does NOT work: if the market's best gains come from low-momentum
 * grind-ups (slow, steady rallies), the defensive sizing under-weights them
 * and lags the champion.
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

  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    // Defensive only: roc90=20 -> 0.5x, 40+ -> full champion size (1.0x).
    const strength = Math.max(0.5, Math.min(1.0, roc90 / 40));
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 * strength };
  }
  return null;
}
