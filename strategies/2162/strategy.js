/*
 * @coinsori-strategy v1
 * name: ETH Uptrend RSI Dip-Buy 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend (price above the 200-SMA), short sharp
 * pullbacks tend to revert back up. This buys weakness inside strength — a different
 * entry logic than pure trend-riding.
 * When it buys and sells: Buys when RSI(14) dips below 35 while price is above the
 * 200-SMA (dip in an uptrend); sells when price closes back below the 200-SMA or RSI
 * climbs above 65 (take profit on the bounce). Position sized by 2% of equity / ATR.
 * When it does NOT work: In a strong downtrend price stays below the 200-SMA so it
 * stays flat (good), but in a choppy sideways market above the SMA it buys dips that
 * keep falling and bleeds fees. Also lags in a parabolic bull where dips are shallow.
 */
function onUpdate(ctx) {
  // Trend filter: price must be above the 200-SMA (uptrend regime)
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;

  // RSI for dip detection and take-profit
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;

  // ATR for risk-scaled position sizing (2% base, proven robust on this market)
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;

  const inUptrend = prevClose > sma200;

  // Exit rules first: close if trend broke or RSI recovered to 65 (bounce done)
  if (ctx.position > 0) {
    if (!inUptrend || rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Entry: RSI oversold dip (<35) only inside an uptrend
  if (inUptrend && rsiPrev > 35 && rsi < 35) {
    const riskPerTrade = ctx.cash * 0.02;
    const qty = riskPerTrade / atr;
    return { side: 'buy', qty: qty };
  }

  return null;
}
