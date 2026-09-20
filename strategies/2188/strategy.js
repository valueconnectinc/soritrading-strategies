/*
 * @coinsori-strategy v1
 * name: ETH 200-SMA Trend Ride ATR-Sized 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: riding ETH's 200-SMA trend gives strong downside
 * protection (it sits in cash through crashes) but the simplest version
 * under-deploys in calm markets and over-risks in volatile ones. ATR-based
 * sizing fixes this: it risks a roughly constant dollar amount per trade, so
 * it enters larger in calm conditions and smaller when volatility is high.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = fixed risk / ATR, capped at 98% of cash.
 * When it does NOT work: whipsaws in sideways chop where price repeatedly
 * pokes above and below the 200-SMA; it also lags exact tops and bottoms and
 * never beats buy-and-hold in a straight bull because it sits in cash at the
 * start and end of each trend.
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

  if (pos <= 0) {
    // fresh long only on a close that crosses back above the 200-SMA
    if (closePrev2 <= smaP && closePrev > sma) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      // risk a fixed $300 per trade; qty = risk / ATR (a 1xATR adverse move = $300 loss)
      const qty = Math.min((ctx.cash / price) * 0.98, 300 / atr);
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
