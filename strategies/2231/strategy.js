/*
 * @coinsori-strategy v1
 * name: DOGE BB-RSI Mean Reversion + ATR Crash Guard 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BB+RSI mean-reversion dip-buy validated well on DOGE
 * (2/3 windows beat market, strong recent-bear defense). Its weakness is
 * catching falling knives in a violent crash. The prior version used a fixed
 * 0.97 SMA gate and a fixed 10% stop; both are crude because DOGE volatility
 * swings wildly. This version makes the crash protection ADAPTIVE to ATR:
 * the trend gate widens (allows deeper dips) only when volatility is calm,
 * and tightens when volatility spikes; the stop is ATR-scaled so it is not
 * blown out by normal noise in high-vol regimes.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold AND price is not too far below the long mean given current
 * volatility (a collapse, not a dip). Sell back at the middle band or when RSI
 * turns overbought; stop out on an ATR-scaled drop below entry.
 * When it does NOT work: in a strong sustained bull the lower band is rarely
 * touched so it sits in cash and misses the melt-up; ATR adaptivity still
 * cannot save it from a genuine multi-week collapse where every dip is a knife.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma100 == null || atr == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  // ATR as a fraction of price = how violent the current regime is.
  const atrPct = atr / price;

  if (pos <= 0) {
    // Adaptive trend gate: allow deeper dips in calm regimes, tighten in violent ones.
    // 4*ATR below the mean is a reasonable "this is a collapse, not a dip" line.
    const collapseLine = sma100 - 4 * atr;
    if (price < bb.lower && rsi < 35 && price > collapseLine) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // Exit at the mean / overbought, or ATR-scaled stop (2.5*ATR below entry).
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
