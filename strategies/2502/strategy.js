/*
 * @coinsori-strategy v1
 * name: LTC 4H Band-Bounce + Regime-Gated Trailing Exit
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce champion's one weakness is exiting too early
 *   in fast melt-ups. A pure trailing exit fixed that but hurt bears (it let losers
 *   run). This version gates the trailing exit behind a 200-SMA uptrend: in an
 *   uptrend a 2.5x-ATR trailing stop lets winners run; in a downtrend the original
 *   fixed SMA20/RSI exit keeps the strategy defensive. Entry stays the proven
 *   deep-oversold lower-band dip.
 * When it buys and sells: Buy when the close is below the lower Bollinger band
 *   AND RSI(2) is deeply oversold, with a cooldown after each exit. If price is
 *   above the 200-SMA (uptrend), hold with a trailing ATR stop so strong bounces
 *   run; otherwise exit on recovery to the SMA20 or overbought RSI. A 6% hard
 *   stop caps single-trade damage.
 * When it does NOT work: In a grinding downtrend price keeps re-touching the lower
 *   band (cooldown reduces but does not eliminate falling-knife buys), and in a
 *   sharp crash price can gap through the trailing or hard stop. It is still a
 *   mean-reversion strategy and will lag steady, low-volatility bull markets with
 *   no deep dips to buy.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const lastExit = ctx.state.lastExit || -9999;
  const cooldownOk = (ctx.i - lastExit) >= 5;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (ctx.state.highest == null || price > ctx.state.highest) ctx.state.highest = price;

    // uptrend regime: let winners run with a trailing stop
    if (price > sma200) {
      const trailStop = ctx.state.highest - 2.5 * atr;
      if (price < trailStop) {
        ctx.state.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      return null;
    }

    // downtrend regime: original defensive exit
    if (price >= sma || rsi > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < bb.lower && rsi < 30 && cooldownOk) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
