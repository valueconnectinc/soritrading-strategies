/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode MR + Trend Ride v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two market behaviors. In choppy/bear markets, sharp drops
 * to oversold levels bounce, so we buy dips and sell rebounds. In strong melt-ups, price
 * rarely dips to oversold, so we add a trend-following breakout entry to participate in
 * the rally instead of sitting in cash. A rising 200-day average decides the regime.
 * When it buys and sells: Buys either (a) on an oversold dip (close below lower Bollinger,
 * RSI<30, rising 200-day avg) or (b) on a 20-day-high breakout only in a genuine melt-up
 * (price far above a rising 200-day avg AND RSI strong). In a strong trend it rides with a
 * 10-day-low trailing stop; otherwise it exits on a rebound to the mid-band or RSI>60.
 * When it does NOT work: In a straight-line crash it stays in cash (good) but can be late
 * re-entering. A false breakout in a weak uptrend can cause a quick loss. Needs either a
 * bounce or a sustained uptrend to profit.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const s200 = ctx.sma(200, 1);
  const s200prev = ctx.sma(200, 2);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const lo10 = ctx.low(10, 1);
  const hi20 = ctx.high(20, 1);
  if (s200 == null || s200prev == null || bb == null || rsi == null || lo10 == null || hi20 == null) return null;

  const rising = s200 > s200prev;
  // Strong trend: price well above a rising 200-day average (melt-up regime).
  const strongTrend = rising && px > s200 * 1.2;

  if (ctx.position <= 0) {
    // Mean-reversion entry: oversold dip in a rising regime.
    if (rising && px > s200 && px < bb.lower && rsi < 30) {
      ctx.state.entryPx = px;
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    // Trend-following entry: only in a GENUINE melt-up (price far above rising 200-day avg
    // AND RSI already strong) to filter out false breakouts in choppy strong markets.
    const pxPrev = ctx.closes[ctx.closes.length - 2];
    if (rising && px > s200 * 1.4 && rsi > 55 && pxPrev != null && pxPrev < hi20 && px > hi20) {
      ctx.state.entryPx = px;
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    return null;
  }

  if (strongTrend) {
    // Ride the melt-up with a trailing stop.
    if (px < lo10) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Normal mean-reversion exit in chop.
  if (px > bb.mid || rsi > 60) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
