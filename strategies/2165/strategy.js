/*
 * @coinsori-strategy v1
 * name: ETH Trend Pyramiding 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the validated 200-SMA trend ride with small ATR-sized
 * positions is robust but under-deploys capital in strong bull markets — a
 * fixed small risk never builds a large position in a clean uptrend, which is
 * why it lags buy-and-hold in bulls. This version keeps the small first entry
 * (so false breakouts only risk a little) and ADDS to the position once the
 * trend has clearly proven itself, capturing more of a sustained bull run.
 * When it buys and sells: enter long on a close above the 200-SMA at a small
 * ATR-sized size; then while in the position, if price stays far above the SMA
 * (strong persistent trend) add further ATR-sized tranches, up to a cap. Sell
 * everything on a close below the 200-SMA.
 * When it does NOT work: in a choppy market that drifts far above the SMA and
 * then reverses, the added tranches turn a small whipsaw into a larger loss.
 * The exit (SMA cross) is unchanged because ATR trailing stops were proven to
 * churn fees and exit winners early.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);
  const cash = ctx.cash;

  // risk 3% of equity per tranche, capped at full-account notional
  const riskQty = (atr && atr > 0) ? (0.03 * cash) / atr : (cash / price) * 0.98;
  const maxQty = (cash / price) * 0.98;

  if (pos <= 0) {
    // entry: close crosses above the 200-SMA
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  }

  // in a position: exit on a close below the 200-SMA
  if (closePrev < sma) {
    return { side: 'sell', qty: pos };
  }

  // pyramiding: add while strongly above the SMA. cap notional at 70% of
  // account so we never fully over-leverage a single trend.
  const distPct = (closePrev - sma) / sma;
  const maxPosNotional = 0.70 * (cash + pos * price);
  const currentNotional = pos * price;
  if (distPct > 0.10 && currentNotional < maxPosNotional) {
    const addQty = Math.min(riskQty, (maxPosNotional - currentNotional) / price);
    if (addQty > 0) return { side: 'buy', qty: addQty };
  }
  return null;
}
