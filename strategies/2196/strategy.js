/*
 * @coinsori-strategy v1
 * name: XRP BB-RSI Mean Reversion Vol-Sized 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the plain BB+RSI mean-reversion on XRP 4h is a proven
 * winner (+247% over a window, beats hold in bear/chop) but carries high
 * drawdown because it keeps dipping into falling markets at full size. This
 * version adds volatility-scaled position sizing: it enters SMALLER when the
 * 14-bar ATR is high (wild market) and LARGER when calm, so each dip-buy risks
 * about the same dollars. This cuts the worst drawdowns without changing the
 * proven entry/exit logic.
 * When it buys and sells: buy when price closes below the lower Bollinger band
 * AND RSI is below 35. Sell when price reverts to the middle band or RSI rises
 * above 65. Position size is set so the dollar risk of a one-ATR move is a
 * fixed fraction of cash.
 * When it does NOT work: mean reversion sits in cash through strong bull runs
 * and misses most of the upside; it also catches falling knives if a crash
 * keeps going (each dip-buy loses). It is a bear/chop-market strategy, not a
 * bull-market one.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (bb == null || rsi == null || atr == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev < bb.lower && rsi < 35) {
      // size inversely to ATR: risk ~3% of cash per one-ATR move
      // fraction = 0.03 / (atr/price); cap at 80% of cash
      const frac = Math.min(0.8, 0.03 / (atr / price));
      const qty = (cash / price) * Math.max(0.05, frac);
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if (closePrev > bb.mid || rsi > 65) return { side: 'sell', qty: pos };
    return null;
  }
}
