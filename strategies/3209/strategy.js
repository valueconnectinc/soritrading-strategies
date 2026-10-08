/*
 * @coinsori-strategy v1
 * name: 1D Multi-Asset Momentum Strength-Sized
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the champion momentum core (90d ROC + 200-SMA + Fed
 * not-hiking) is validated and its slow exit is hard to beat — two attempts
 * to replace the exit with stops failed with whipsaw. This version keeps the
 * entry AND exit exactly as-is, and only changes the mechanism of POSITION
 * SIZING: instead of a fixed third of equity per asset, size by momentum
 * strength. Weak trends get smaller positions (less risk in choppy markets),
 * strong trends get bigger ones (more reward in real bulls).
 * When it buys and sells: buy BTC/ETH/SOL when 90d momentum > +20%, price
 * above the 200-day average, and the Fed is not hiking. Position size scales
 * from 0.5x to 1.5x of the normal third, proportional to how strong the 90d
 * momentum is. Sell when momentum fades below +5% or price breaks the 200-day.
 * When it does NOT work: in a low-momentum sideways market it sizes down and
 * under-weights the eventual breakout; and sizing up in a blow-off top means
 * a bigger position when the reversal hits.
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
    // Size scales with trend strength: roc90=20 -> 0.5x, 30 -> 1x, 45+ -> 1.5x.
    const strength = Math.max(0.5, Math.min(1.5, roc90 / 30));
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 * strength };
  }
  return null;
}
