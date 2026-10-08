/*
 * @coinsori-strategy v1
 * name: Crypto 1D Multi-Asset Momentum Hysteresis
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the single-asset momentum hysteresis is the validated
 * champion on BTC. Running the SAME recipe independently on BTC, ETH and SOL
 * diversifies across the three largest coins — when one asset's trend dies,
 * the others keep the book working. Each asset is sized to a third of equity.
 * When it buys and sells: on each asset, buy when its 90-day momentum is
 * above +20% and price is above its 200-day average; sell when momentum fades
 * below +5% or price breaks the 200-day. Size = 1/3 of current equity.
 * When it does NOT work: in a broad coordinated crypto bear all three trend
 * gates go flat at once (capital is safe but there is no return); a single
 * asset's melt-up is diluted by the other two legs.
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

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 };
  }
  return null;
}
