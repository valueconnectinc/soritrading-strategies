/*
 * @coinsori-strategy v1
 * name: Refined Trend-Scaled Band-Bounce BCH 1D
 * ex: binance
 * syms: BCHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The trend-scaled band-bounce (loosen RSI entry in strong
 * bulls) worked on XRP/LTC but caught mid-chop whipsaws on BCH. This adds a
 * pullback-quality filter (price below the 20-SMA) to the loose bull entry so
 * it only buys a genuine dip, filtering out BCH-style mid-chop. Testing whether
 * the filter fixes BCH's bull window while keeping XRP's improvement.
 * When it buys and sells: strict panic-bottom entry (RSI<30, lower band) near/
 * below the 200-SMA; in a strong bull (price >=30% above 200-SMA) buys a dip
 * (price below 20-SMA AND at/below middle band with RSI<45). Exits at the
 * middle band / RSI>50 or a 6-ATR stop.
 * When it does NOT work: in a violent crash below the 200-SMA it still buys
 * falling knives; in a choppy bull with no mean reversion it whipsaws.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma20 = ctx.sma(20, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || sma20 == null || bb == null || rsi == null) return null;

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

  const bullDepth = price / sma200;
  if (bullDepth >= 1.30) {
    if (price < sma20 && price <= bb.mid && rsi < 45) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
