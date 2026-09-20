/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride + FearGreed Top-Exit 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 200-SMA trend ride is a solid champion but it gives
 * back the last part of every trend because it only exits after price falls
 * back through the SMA. The fear/greed index is a sentiment gauge: when it is
 * in extreme greed (>85) the crowd is euphoric, which historically marks
 * blow-off tops. Exiting into that euphoria locks in the top of a move instead
 * of riding the reversal down. The normal SMA cross remains the backstop.
 * When it buys and sells: buy on a close crossing above the 200-SMA; hold while
 * above it; exit if fear/greed enters extreme greed (>85) OR on a close back
 * below the 200-SMA.
 * When it does NOT work: in a strong bull that keeps trending while sentiment
 * stays hot, the extreme-greed exit sells too early and may miss the final leg;
 * fear/greed data is slow-moving daily, so it cannot help intraday chop.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // 200-SMA backstop exit
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }

    // fear/greed sentiment exit: extreme greed (>85) = crowd euphoria, a
    // classic blow-off top signal. Exit into it to lock in the trend top.
    const fg = ctx.data('fear_greed');
    if (fg != null && fg > 85) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
