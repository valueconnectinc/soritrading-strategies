/*
 * @coinsori-strategy v1
 * name: Trend-Continuation Pullback BTC 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed long-term uptrend, short dips that bounce back off
 * the 20-day average tend to resume the trend — we buy the dip that reclaims the EMA20
 * instead of chasing new highs (the opposite entry logic of the Donchian breakout champion).
 * When it buys and sells: Buys when the last closed bar dipped below the 20-day average
 * and the price then climbs back above it, while the 200-day average is rising and RSI is
 * not overbought. Sells when price closes below the 50-day average (trend broken) or drops
 * 3x ATR below entry (hard stop).
 * When it does NOT work: In choppy sideways markets the 20-day average gets crossed back
 * and forth and the strategy whipsaws; in a sharp bear market the 200-day gate keeps it
 * flat for long stretches (safe, but no upside). A single violent crash can gap through
 * the stop before it fills.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;

  const ema20 = ctx.ema(20, 1);          // short-term trend reference (last closed bar)
  const ema50 = ctx.ema(50, 1);          // trend-break exit reference (last closed bar)
  const sma200 = ctx.sma(200, 1);        // long-term regime gate
  const sma200prev = ctx.sma(200, 2);    // to check the 200-day slope
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || sma200 == null || sma200prev == null || rsi == null || atr == null) return null;

  const prevClose = ctx.closes.at(-2);   // last CLOSED bar
  if (prevClose == null) return null;

  const uptrend = sma200 > sma200prev;   // 200-day average must be rising

  if (pos === 0) {
    // Entry: last closed bar was BELOW the 20-day average (a dip), price now back above it.
    const dipped = prevClose < ema20;
    const reclaimed = price > ema20;
    const notOverbought = rsi < 70;      // avoid chasing a vertical spike
    ctx.watch([{
      side: 'buy', price: ema20, trigger: 'above', note: 'EMA20 reclaim after dip',
      conds: [
        { label: '200d avg rising', ok: uptrend },
        { label: 'prev close below EMA20', ok: dipped },
        { label: 'RSI(14) closed', now: rsi, op: '<', ref: 70, closed: true }
      ]
    }]);
    if (uptrend && dipped && reclaimed && notOverbought) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // Exits: hard stop (3x ATR below entry) and trend break (close below 50-day average).
  const stopPx = ctx.entryPx - 3 * atr;
  ctx.watch([
    { side: 'sell', price: stopPx, trigger: 'below', note: '3x ATR hard stop' },
    { side: 'sell', price: ema50, trigger: 'below', note: '50d trend break' }
  ]);
  if (price <= stopPx) return { side: 'sell', qty: pos };
  if (price < ema50) return { side: 'sell', qty: pos };
  return null;
}
