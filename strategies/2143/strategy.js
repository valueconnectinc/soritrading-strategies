/*
 * @coinsori-strategy v1
 * name: ETH Slow Trend Ride ATR-Sized 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the plain 200-SMA trend ride is our most robust idea
 * (strong downside protection, acceptable bull lag). This version keeps the
 * exact same buy/sell signals but sizes each position by volatility (ATR): we
 * risk a fixed dollar amount per trade, so a high-volatility entry takes a
 * smaller position and a calm entry takes a bigger one. That smooths the
 * equity curve and reduces the size of drawdowns without changing the signals.
 * When it buys and sells: long while price stays above the 200-SMA, sell on a
 * close below it, re-enter on a close back above. Position size shrinks when
 * volatility is high.
 * When it does NOT work: same whipsaw in sideways chop and lag at turns as the
 * base; ATR sizing does not change the signal, only the size.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      // risk a fixed $300 per trade: qty = risk / (ATR), capped at 98% of cash
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      const riskQty = 300 / atr;
      const maxQty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
