/*
 * @coinsori-strategy v1
 * name: ETH Trend ATR Trailing + Sized 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the 200-SMA trend ride protects downside but its exit
 * lags badly in bull runs — it gives back a lot of profit. This version keeps
 * the volatility-based position sizing (risk a fixed $ per trade) but replaces
 * the fixed SMA exit with a trailing stop that locks in profit as price rises,
 * so strong trends are captured better while reversals still get stopped out.
 * When it buys and sells: long on a close above the 200-SMA; then trail a stop
 * at ATR-multiples below the highest close since entry; exit when price closes
 * below the trailing stop OR below the 200-SMA (final backstop). Position size
 * shrinks when volatility is high.
 * When it does NOT work: choppy ranges where the trailing stop whipsaws; and
 * the 200-SMA backstop still lags at sharp V-reversals.
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
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      const riskQty = 300 / atr; // risk a fixed $300 per trade, sized by volatility
      const maxQty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // track highest close since entry, trail stop 3x ATR below it
    const entryPx = ctx.entryPx;
    const atr = ctx.atr(14, 1);
    if (atr == null || atr <= 0) return null;
    // highest close since entry: scan recent closes (bounded)
    let highest = entryPx;
    const closes = ctx.closes;
    for (let k = closes.length - 2; k >= 0 && k >= closes.length - 60; k--) {
      if (closes[k] > highest) highest = closes[k];
    }
    const trail = highest - 3 * atr; // 3x ATR trailing distance
    if (closePrev < trail || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
