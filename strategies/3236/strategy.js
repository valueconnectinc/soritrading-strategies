/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Fed Filter (ATR-Scaled)
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 90-day momentum + 200-day average core is the validated
 * champion on BNB. The Fed not-hiking filter targets the 2018/2022 crypto bears.
 * Adding ATR-scaled position sizing (smaller size when the daily range is wide)
 * trims exposure in stress, which the ledger showed cuts drawdown on the BTC/SOL
 * champions.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is above
 * the 200-day average, and the Fed is not hiking. Sells when momentum fades below
 * +5% or price breaks the 200-day average. Position size shrinks when volatility
 * is high.
 * When it does NOT work: in a Fed-easing regime that is still a crypto bear (late
 * 2018) the filter cannot help, and it can lag a raging bull by waiting for the
 * 200-day break. Vol-scaling also trims upside in calmer bull runs. Single-symbol
 * means no diversification across coins.
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

  // Hiking = rate now is higher than 30 days ago. Missing Fed data treated as
  // not hiking so the strategy still trades (baseline behaviour).
  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.position;

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    // ATR-based vol scaling: target daily range 3.5% of price, floor at 50%.
    // Wide ATR% -> smaller position. 3.5% is BNB's typical daily range.
    const atr = ctx.atr(14, 1);
    let scale = 1.0;
    if (atr != null && atr > 0) {
      const atrPct = (atr / prevClose) * 100;
      scale = Math.max(0.5, Math.min(1.0, 3.5 / atrPct));
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 * scale };
  }
  return null;
}
