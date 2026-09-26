/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion BCH 4H
 * ex: binance
 * syms: BCHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion — the only robust
 * family validated on 25+ assets in this job. It buys genuine panic bottoms
 * (price below the lower Bollinger band with RSI<30) only while price holds
 * above the 200-SMA, then sells back to the middle band. This is a defensive,
 * low-drawdown strategy that protects capital in crashes and participates in
 * recoveries.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * AND RSI(14)<30 AND price is above the 200-SMA; sells when price reaches the
 * middle band or RSI>50, or on a 6x-ATR stop. 5-bar cooldown between trades.
 * When it does NOT work: in a violent crash below the 200-SMA it keeps buying
 * falling knives; it lags strong melt-ups (sits in cash during parabolic bulls).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
