/*
 * @coinsori-strategy v1
 * name: BTC 1H Intraday Bollinger Mean-Reversion v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The v1 1h mean-reversion was weak because most intraday
 * lower-band flushes are noise, not real capitulation. This version adds a
 * volume-spike confirmation: it only buys a flush that arrives on at least
 * 1.6x normal volume, on the theory that a real panic sell-off is loud, while
 * quiet drift to the band is not worth catching.
 * When it buys and sells: buys a lower-Bollinger-band flush with RSI<30, price
 * above the 200-hour average, AND volume at least 1.6x its 20-hour average;
 * sells on RSI recovery above 50 or a return to the middle band.
 * When it does NOT work: in a grinding one-way downtrend the loud flushes are
 * falling knives, and in a low-volume melt-up the confirmations rarely fire so
 * it sits out the rally.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  if (pos > 0) {
    if (rsi > 50 || price > bb.mid) {
      return { side: 'sell', qty: pos };
    }
    if (price < bb.lower * 0.97) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volume-spike confirmation: only a loud flush is a real capitulation.
  // 1.6x threshold chosen to pass the biggest 10% of hourly bars.
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null || avgVol <= 0) return null;
  if (price > sma200 && rsi < 30 && price <= bb.lower && vol > avgVol * 1.6) {
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
