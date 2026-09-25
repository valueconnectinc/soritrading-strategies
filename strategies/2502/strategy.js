/*
 * @coinsori-strategy v1
 * name: LTC 4H Band-Bounce + Trailing Uptrend Exit
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion (buy deep oversold
 *   dips below the lower Bollinger band, sell on recovery) is validated on many
 *   assets, but its one documented weakness is exiting too early in fast melt-ups
 *   (it sells at the SMA20 bounce and misses the rally). This version keeps the
 *   proven deep-oversold entry but replaces the fixed SMA20 exit with a trailing
 *   ATR stop once price recovers above the SMA — so weak bounces still exit fast
 *   while strong bounces are allowed to run into bigger rallies.
 * When it buys and sells: Buy when the close is below the lower Bollinger band
 *   AND RSI(2) is deeply oversold, with a cooldown after each exit. After entry,
 *   if price recovers above the 20-SMA, hold with a 2.5x-ATR trailing stop
 *   instead of selling immediately; otherwise exit on recovery to the SMA or an
 *   overbought RSI. A 6% hard stop caps single-trade damage.
 * When it does NOT work: In a grinding downtrend price can keep re-touching the
 *   lower band for many bars (cooldown reduces but does not eliminate falling-knife
 *   buys), and in a sharp crash price can gap through the trailing stop. It is
 *   still a mean-reversion strategy and will lag steady, low-volatility bull
 *   markets where there are no deep dips to buy.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  // cooldown: wait 5 bars after each exit to avoid re-buying a falling knife
  const lastExit = ctx.state.lastExit || -9999;
  const cooldownOk = (ctx.i - lastExit) >= 5;

  if (pos > 0) {
    // hard stop always active
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };

    // track highest close since entry for the trailing stop
    if (ctx.state.highest == null || price > ctx.state.highest) ctx.state.highest = price;

    if (price > sma) {
      // recovered above SMA = strong bounce regime: let it run with a trailing stop
      const trailStop = ctx.state.highest - 2.5 * atr; // 2.5 ATR: tight enough to cut weak bounces, wide enough to ride melt-ups
      if (price < trailStop) {
        ctx.state.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      return null;
    }

    // still below SMA: exit on recovery toward the SMA or overbought RSI
    if (price >= sma || rsi > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // entry: deep oversold dip below the lower band, with cooldown
  if (price < bb.lower && rsi < 30 && cooldownOk) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
