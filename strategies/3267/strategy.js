/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto crowds are systematically wrong at the extremes —
 * maximum fear marks good buying points and maximum greed marks good selling
 * points. This strategy trades the opposite of the crowd using the Fear & Greed
 * index as its only signal.
 * When it buys and sells: it buys when the Fear & Greed index is at or below 20
 * (extreme fear) and sells when it reaches 65 (greed), after 120 days, or if the
 * price falls 30% below entry (stop-loss).
 * When it does NOT work: it trades rarely, so it can sit in cash for months and
 * miss a strong bull run that never dips into extreme fear. In a slow grind higher
 * with no fear spikes it simply never buys.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment data unavailable -> do nothing

  if (ctx.position <= 0) {
    // Buy only at extreme fear; skip if already holding.
    if (fg <= 20) {
      ctx.state.entryBar = ctx.i;
      return { side:'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  // Track how long we have held in days (1d bars).
  const entryBar = (ctx.state.entryBar == null) ? ctx.i : ctx.state.entryBar;
  const heldBars = ctx.i - entryBar;

  const stop = ctx.entryPx ? ctx.entryPx * 0.70 : 0; // -30% hard stop
  ctx.watch([{ side:'sell', price: stop, trigger:'below', note:'stop -30%' }]);

  if (fg >= 65 || heldBars >= 120 || (stop > 0 && ctx.price <= stop)) {
    ctx.state.entryBar = null;
    return { side:'sell', qty: ctx.position };
  }
  return null;
}
