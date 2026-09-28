/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode Mean-Reversion + Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two market behaviors. In choppy/bear markets, sharp drops
 * to oversold levels bounce, so we buy dips and sell rebounds. In strong melt-ups, we
 * instead let a winning position ride with a trailing stop to capture the upside. A
 * rising 200-day average decides which regime we are in.
 * When it buys and sells: Buys when the close is below the lower Bollinger band, RSI is
 * oversold (<30), and the 200-day average is rising. If the uptrend is strong (price well
 * above the 200-day average), it exits on a trailing stop (breaking the 10-day low) to
 * ride the rally; otherwise it exits on a rebound to the mid-band or RSI>60.
 * When it does NOT work: In a straight-line crash it stays in cash (good) but it can be
 * late re-entering after a trend. It is a counter-trend strategy that needs either a
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
  if (s200 == null || s200prev == null || bb == null || rsi == null || lo10 == null) return null;

  const rising = s200 > s200prev;
  // Strong trend: price well above a rising 200-day average (melt-up regime).
  const strongTrend = rising && px > s200 * 1.2;

  if (ctx.position <= 0) {
    if (rising && px > s200 && px < bb.lower && rsi < 30) {
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
