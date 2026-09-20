/*
 * @coinsori-strategy v1
 * name: ETH Funding-OI Contrarian 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: funding rate measures how crowded the leveraged crowd is
 * on one side. When funding is strongly negative, shorts are paying longs —
 * the crowd is over-short and a bounce often follows. When funding is strongly
 * positive, longs are crowded and the move is vulnerable. This is a genuinely
 * different signal family (positioning/leverage data) from price-only trend
 * rules. An SMA trend filter keeps us from fighting a sustained downtrend.
 * When it buys and sells: long when funding < -0.01% (crowded shorts) and price
 * is above the SMA100; sell when funding > +0.02% (crowded longs) or price
 * closes below the SMA100.
 * When it does NOT work: funding can stay extreme for a long time while the
 * trend keeps running, so the contrarian entry can be early and painful in a
 * strong bear. It also needs reliable funding data — if none is available in
 * the backtest it simply never trades.
 */
function onUpdate(ctx) {
  const f = ctx.funding;
  if (f == null) return null; // no funding data -> stand aside
  const sma = ctx.sma(100, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (sma == null || closePrev == null) return null;
  const pos = ctx.position;
  if (pos <= 0) {
    // contrarian long: shorts crowded (negative funding) + trend not broken
    if (f < -0.0001 && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
      // risk a fixed $400 per trade, sized by ATR
      const qty = Math.min(400 / atr, (ctx.cash / ctx.price) * 0.98);
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit: longs crowded (positive funding) or trend broken
    if (f > 0.0002 || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
