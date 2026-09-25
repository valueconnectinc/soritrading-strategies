/*
 * @coinsori-strategy v1
 * name: ETH 1D RSI2 Capitulation Bounce
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: After a sharp, fast sell-off, a 2-period RSI dropping to
 *   extreme oversold (<5) often marks a short-term capitulation where the last
 *   weak sellers are flushed out. Buying that moment bets on a snap-back bounce
 *   before the market resumes its larger trend.
 * When it buys and sells: Buy when RSI(2) is below 5 (extreme panic). Exit when
 *   price recovers to the 20-day average or after a fixed 8% gain, with a 6%
 *   stop to cap the loss if the knife keeps falling.
 * When it does NOT work: In a genuine crash, extreme oversold can stay
 *   oversold — RSI(2) < 5 for many days while price keeps falling. Buying every
 *   capitulation in a sustained downtrend repeatedly loses.
 */
function onUpdate(ctx) {
  const rsi2 = ctx.rsi(2, 1);
  if (rsi2 == null) return null;
  const price = ctx.price;

  const pos = ctx.position;
  if (pos > 0) {
    const entry = ctx.entryPx || price;
    const ret = price / entry - 1;
    const sma20 = ctx.sma(20, 1);
    if (ret >= 0.08 || ret <= -0.06 || (sma20 != null && price > sma20)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rsi2 < 5) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }
  return null;
}
