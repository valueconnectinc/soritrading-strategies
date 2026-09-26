/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion DOGE 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Exact copy of the confirmed band-bounce mean-reversion
 * champion (validated on XRP/LTC/DOT/BNB/ADA/AVAX). DOGE 4h often overreacts to
 * the downside, touches the lower Bollinger band, then snaps back to the mean.
 * Buying that panic-bottom and selling back to the middle captures the snap-back.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * band with RSI<30 (panic), only when price is above the 200-period SMA (don't
 * catch knives in a downtrend); exits at the middle band / RSI>50 or a stop.
 * When it does NOT work: this family is asset-specific — it may fail on DOGE
 * (it failed on ETH/BCH/SOL). Lags strong melt-ups; sits in cash during rallies;
 * a panic that keeps falling still loses.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) return { side: 'sell', qty: pos };
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
    return null;
  }

  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
