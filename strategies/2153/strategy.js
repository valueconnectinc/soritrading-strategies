/*
 * @coinsori-strategy v1
 * name: ETH 1H Mean Reversion Oversold Bounce
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: the validated ETH 4h trend champion rides long trends, but it
 * does nothing during chop and gives back gains in sharp reversals. This is the
 * opposite bet — a short-horizon contrarian that fades short-term panic. When
 * price is stretched far below its recent average on an intraday scale, it tends
 * to snap back. It is designed to make money in the choppy, range-bound hours the
 * trend strategy ignores, so the two can complement each other.
 * When it buys and sells: buy when the 1h close is below the lower Bollinger band
 * AND RSI is very oversold (a short-term panic). Sell when price bounces back up
 * to the middle band (mean) or RSI recovers. Position size is set by ATR so each
 * trade risks roughly the same amount regardless of how violent the move is.
 * When it does NOT work: in a genuine crash (a real breakdown, not a dip) the
 * "oversold bounce" keeps buying into a falling knife and loses repeatedly. A
 * slow-trend guard reduces this but cannot eliminate it. It also loses in a
 * strong one-way bull where price never dips far enough to trigger an entry.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const bbMid = ctx.sma(20, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const emaFast = ctx.ema(50, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bbMid == null || rsi == null || atr == null || emaFast == null || closePrev == null) return null;

  const pos = ctx.position;
  const cash = ctx.cash;
  const price = ctx.price;

  if (pos <= 0) {
    // Only buy a dip when the medium-term (50h) trend is not in freefall —
    // this filters out sustained crashes where "oversold" keeps getting more oversold.
    if (closePrev < emaFast * 0.97) return null;
    const oversold = closePrev <= bb.lower && rsi < 28;
    if (!oversold) return null;
    // risk 1.5% of cash per trade, converted to coins via ATR
    const risk = 0.015 * cash;
    if (atr <= 0) return { side: 'buy', qty: (cash / price) * 0.5 };
    const riskQty = risk / atr;
    const maxQty = (cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(riskQty, maxQty) };
  } else {
    // Exit when price recovers to the middle band (mean) or RSI turns up —
    // the bounce has played out, take the profit rather than ride a new trend.
    if (closePrev >= bbMid || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
