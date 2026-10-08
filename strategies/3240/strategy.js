/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Confirmed Bollinger MR
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * Oversold bounces on BTC are more reliable when they come on above-average volume
 * (panic selling with real participation tends to mark a local bottom) AND while the
 * longer uptrend is still intact.
 * When it buys and sells:
 * Buys when price closes below the lower Bollinger band AND volume is above its 20-bar
 * average AND RSI is very low AND price is above SMA(100). Sells when price climbs back
 * to the middle band or RSI recovers. Hard stop at 2x ATR below entry.
 * When it does NOT work:
 * In a strong downtrend it stays out (trend filter), but in a choppy sideways market
 * the bounces are shallow and fees eat the edge.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);       // closed bar: lower band is the mean-reversion trigger
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const avgVol = ctx.avgVol(20);
  const sma100 = ctx.sma(100, 1);
  const vol = ctx.vol;               // current (still-forming) bar volume
  const price = ctx.price;

  if (bb == null || rsi == null || atr == null || avgVol == null || sma100 == null) return null;

  const inPos = ctx.position > 0;
  const entry = ctx.entryPx || 0;

  // EXIT: bounce back to middle band, RSI recovered, or 2x ATR hard stop
  if (inPos) {
    if (price >= bb.mid || rsi > 58 || (entry > 0 && price <= entry - 2 * atr)) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // ENTRY: oversold + volume spike + still in uptrend (no falling knives)
  if (price > sma100 && price < bb.lower && rsi < 32 && vol > avgVol * 1.3) {
    // risk 1% of cash on a 2x ATR stop, capped at full cash
    const qty = Math.min(ctx.cash * 0.01 / (2 * atr), ctx.cash / price * 0.99);
    return { side: 'buy', qty };
  }
  return null;
}
