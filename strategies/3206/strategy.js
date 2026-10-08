/*
 * @coinsori-strategy v1
 * name: Multi-Asset Momentum Hysteresis + Fed Filter
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the momentum hysteresis core (90d-ROC + 200-SMA) is the
 * validated champion, but its worst drawdowns come from the 2018 and 2022
 * crypto bears — both periods when the Fed was hiking rates. The Fed funds
 * rate is the one macro signal that reliably populates in backtests, and a
 * standalone Fed filter was already promising. This version only opens NEW
 * positions while the Fed is NOT hiking (rate not higher than 30 days ago),
 * so it skips the hiking bears but still rides the easing/neutral bulls.
 * When it buys and sells: on each of BTC/ETH/SOL, buy when 90-day momentum
 * is above +20%, price is above the 200-day average, AND the Fed is not
 * hiking. Sell when momentum fades below +5% or price breaks the 200-day.
 * Each asset is sized to a third of equity.
 * When it does NOT work: in a Fed-easing regime that is still a crypto bear
 * (late 2018) the filter cannot help; and it can lag a raging bull because
 * it skips nothing it should catch — it only ever blocks during hiking.
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

  // Hiking = rate now is higher than 30 days ago. If Fed data is missing,
  // treat as not hiking so the strategy still trades (baseline behaviour).
  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 };
  }
  return null;
}
