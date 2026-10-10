/*
 * @coinsori-strategy v1
 * name: BTC RSI2 Panic Dip 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a healthy uptrend, sharp panic dips are usually bought back quickly. An extremely oversold 2-period RSI after a red candle marks such a dip; the bounce is the trade.
 * When it buys and sells: Buys when the 2-period RSI drops below 10 while price is above the 200-day average (uptrend only); sells after 5 days, when RSI turns overbought, or on an 8% stop.
 * When it does NOT work: In a real bear market price keeps falling after the panic dip (the trend filter misses some), and the 8% stop caps but cannot prevent losses; flat markets give few entries.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed bar RSI(2)
  const trend = ctx.sma(200, 1);   // closed bar 200-day average
  const price = ctx.price;
  if (rsi == null || trend == null || price == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // Buy extreme panic only inside an uptrend (price above 200-SMA)
    if (rsi < 10 && price > trend) {
      st.entryBar = ctx.i;
      ctx.watch([{ side: 'sell', price: price * 0.92, trigger: 'below', note: '8% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  const rsiNow = ctx.rsi(2, 0);
  ctx.watch([{ side: 'sell', price: entry * 0.92, trigger: 'below', note: '8% stop' }]);
  // Exit on stop, overbought, or a 5-day time limit (mean reversion decays fast)
  if (price <= entry * 0.92 || rsiNow > 70 || barsHeld >= 5) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
