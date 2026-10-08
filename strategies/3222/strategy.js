/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum Hysteresis
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 90-day momentum + 200-day average core is the validated
 * champion on BTC/ETH/SOL. This tests the same proven core on BNB, a coin with
 * strong long-term trends, to see if the edge generalizes to a new symbol.
 * When it buys and sells: buys when 90-day momentum is above +20% and price is
 * above the 200-day average. Sells when momentum fades below +5% or price breaks
 * the 200-day average.
 * When it does NOT work: in a long bear trend momentum stays negative and the
 * strategy sits out (correctly), but it can give back a full bull-to-bear turn if
 * the 200-day break lags. Single-symbol means no diversification across coins.
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

  const pos = ctx.position;

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
