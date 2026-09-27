/*
 * @coinsori-strategy v1
 * name: BTC 1H Intraday Bollinger Mean-Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: All validated champions in this job live on 1d/4h. This
 * tests whether the mean-reversion edge (buy panic flushes, sell the snap-back)
 * that works on daily bars also holds intraday on 1h bars, where noise is
 * larger and flushes are more frequent. Intraday pullbacks to the lower band
 * after a sharp drop tend to bounce, especially when the longer trend is up.
 * When it buys and sells: it buys when price is below the 200-hour average
 * (only after a real flush) at the lower Bollinger band with RSI oversold;
 * it sells when RSI recovers above 50 or price climbs back to the middle band.
 * When it does NOT work: in a persistent one-way downtrend the oversold bounces
 * are weak and it catches falling knives; and 1h noise means more whipsaw and
 * more fees than the daily version.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  // Exit: mean-reversion is done when RSI recovers or price returns to the middle band.
  if (pos > 0) {
    if (rsi > 50 || price > bb.mid) {
      return { side: 'sell', qty: pos };
    }
    // hard stop below the lower band on a continued break
    if (price < bb.lower * 0.97) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: deep oversold flush at the lower band, only in a broader uptrend.
  // Requiring price > 200-SMA avoids catching knife falls in a downtrend.
  if (price > sma200 && rsi < 30 && price <= bb.lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
