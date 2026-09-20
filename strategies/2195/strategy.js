/*
 * @coinsori-strategy v1
 * name: XRP Adaptive Regime 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the mean-reversion family (BB+RSI dip-buy) is a proven
 * winner on XRP in choppy/bear markets but sits in cash and misses strong bull
 * runs. This version switches strategy by market regime, detected with the
 * ATR(14)/ATR(50) ratio: in a trending/expanding regime it follows the trend,
 * in a compressed/choppy regime it buys dips. One adaptive system instead of
 * two fixed strategies.
 * When it buys and sells: if volatility is expanding (ratio high) it buys when
 * price is above its 50-bar average and sells when it falls below. If volatility
 * is compressed (ratio low) it buys at the lower Bollinger band with RSI below
 * 35 and sells when price reverts to the middle band or RSI rises above 65.
 * When it does NOT work: regime switches are lagging, so a sudden transition
 * can catch it on the wrong side; in a choppy-but-expanding period the trend
 * leg whipsaws; and no system beats buy-and-hold in a clean relentless bull.
 */
function onUpdate(ctx) {
  const atr14 = ctx.atr(14, 1);
  const atr50 = ctx.atr(50, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (atr14 == null || atr50 == null || atr50 <= 0) return null;

  const ratio = atr14 / atr50; // >1 expanding/trending, <1 compressed/choppy
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  // TRENDING regime: follow the 50-bar trend
  if (ratio > 1.15) {
    if (sma50 == null || closePrev == null) return null;
    if (pos <= 0) {
      if (closePrev > sma50) return { side: 'buy', qty: (cash / price) * 0.95 };
      return null;
    } else {
      if (closePrev < sma50) return { side: 'sell', qty: pos };
      return null;
    }
  }

  // CHOPPY regime: mean-reversion dip-buy
  if (bb == null || rsi == null) return null;
  if (pos <= 0) {
    if (closePrev < bb.lower && rsi < 35) {
      return { side: 'buy', qty: (cash / price) * 0.6 };
    }
    return null;
  } else {
    if (closePrev > bb.mid || rsi > 65) return { side: 'sell', qty: pos };
    return null;
  }
}
