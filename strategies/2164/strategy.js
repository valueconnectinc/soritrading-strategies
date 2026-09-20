/*
 * @coinsori-strategy v1
 * name: ETH Daily 200-SMA Trend Ride 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 200-SMA trend filter is a proven edge on ETH 4h. On the
 * daily timeframe the same filter should produce fewer, longer trades with less
 * fee drag and whipsaw — testing whether the edge holds on a longer horizon.
 * When it buys and sells: Buys when price closes above the 200-SMA; sells when it
 * closes back below. Position sized by 2% of equity / ATR(14) so each trade risks
 * roughly the same amount regardless of volatility.
 * When it does NOT work: In a long sideways chop around the 200-SMA (price crossing
 * back and forth) it whipsaws and bleeds fees. Also lags the very top of parabolic
 * bulls since it only exits on a closing break below the SMA.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  if (sma == null) return null;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;

  const inUptrend = prevClose > sma;

  if (ctx.position > 0) {
    if (!inUptrend) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (inUptrend) {
    const riskPerTrade = ctx.cash * 0.02;
    const qty = riskPerTrade / atr;
    return { side: 'buy', qty: qty };
  }

  return null;
}
