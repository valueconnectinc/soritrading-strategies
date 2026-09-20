/*
 * @coinsori-strategy v1
 * name: ETH BB RSI Mean Reversion 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto prices often over-extend downward and snap back to
 * the mean. Buying a sharp oversold dip near the lower Bollinger band and
 * selling when price returns to the middle captures that snap-back. This exact
 * design (BB lower + RSI<35 + volume) was validated as promising on SOL and is
 * a completely different family from the slow trend-following champion.
 * When it buys and sells: buy when price touches the lower Bollinger band,
 * RSI is oversold (<35) and volume is above average; sell when price reaches
 * the middle band or RSI climbs above 60. No stop-loss and no trend filter —
 * those were proven to hurt this signal.
 * When it does NOT work: in a strong one-way bear market price keeps
 * over-extending and the snap-back never comes, so each buy bleeds. It also
 * under-performs in clean bull runs where dips are shallow (rarely hit RSI<35).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (bb == null || rsi == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    // buy an oversold dip at the lower band, only if volume confirms activity
    if (closePrev <= bb.lower && rsi < 35 && vol != null && avgVol != null && vol > 1.2 * avgVol) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  }

  // sell when price snaps back to the middle band or RSI recovers above 60
  if (closePrev >= bb.mid || rsi > 60) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
