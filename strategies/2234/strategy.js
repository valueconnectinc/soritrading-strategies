/*
 * @coinsori-strategy v1
 * name: DOGE BB-RSI Mean Reversion + Crash Guard 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The BB+RSI mean-reversion dip-buy validated well on DOGE
 * (2/3 windows beat market, strong recent-bear defense). Its one known weakness
 * is catching falling knives in a violent crash — buying the lower band while
 * price keeps falling. This version adds a trend guard (don't buy when price is
 * far below the long mean) and a hard stop-loss to cap crash damage.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold AND price is still near/above the long-term SMA (so we only
 * buy dips inside an intact range, not a collapse). Sell back at the middle band
 * or when RSI turns overbought; stop out if price falls ~10% below entry.
 * When it does NOT work: in a strong sustained bull the lower band is rarely
 * touched so it sits in cash and misses the melt-up; the trend guard also makes
 * it skip the first leg of a genuine bottom (dips below the long mean).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma100 = ctx.sma(100, 1);
  if (bb == null || rsi == null || sma100 == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // only buy a dip if we are not already in a collapse (price crashed below the long mean)
    if (price < bb.lower && rsi < 35 && price > sma100 * 0.97) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit at the mean / overbought, or stop out on a crash
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx * 0.90) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
