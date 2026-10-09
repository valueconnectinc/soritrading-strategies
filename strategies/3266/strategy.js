/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Mean-Reversion
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto prices often snap back to their moving average after
 * sharp moves, so buying when the price is stretched below the lower Bollinger Band
 * and selling when it returns to the middle can capture that mean-reversion move.
 * When it buys and sells: it buys when price touches the lower band (oversold) and
 * sells when price climbs back to the middle band. A hard stop-loss limits losses.
 * When it does NOT work: in a sustained downtrend the price keeps falling below the
 * lower band and never reverts, so the stop-loss gets hit repeatedly. Mean reversion
 * is a ranging-market strategy and loses in strong trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const bbMid = ctx.bb(20, 2, 1);
  if (bb == null || bbMid == null) return null;
  const lower = bb.lower;
  const mid = bb.mid;
  const prevClose = ctx.closes.at(-2);
  if (prevClose == null) return null;

  // Optional sentiment filter: only buy when fear/greed is not extreme greed (avoid
  // buying a blow-off top). If data is missing, proceed without the filter.
  let fg = ctx.data('fear_greed');
  let allowBuy = true;
  if (fg != null) {
    allowBuy = fg < 60; // skip buys in extreme greed regime
  }

  if (ctx.position <= 0) {
    // Mean-reversion entry: price crossed below the lower band on the last closed bar.
    if (prevClose < lower && allowBuy) {
      ctx.watch([{ side:'sell', price: mid, trigger:'above', note:'revert to mid' },
                 { side:'sell', price: ctx.entryPx ? ctx.entryPx*0.93 : 0, trigger:'below', note:'stop -7%' }]);
      return { side:'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }

  // Exit when price reverts to the middle band, or hard stop-loss at -7% below entry.
  const stop = ctx.entryPx ? ctx.entryPx * 0.93 : 0;
  ctx.watch([{ side:'sell', price: mid, trigger:'above', note:'revert to mid' },
             { side:'sell', price: stop, trigger:'below', note:'stop -7%' }]);
  if (ctx.price >= mid) {
    return { side:'sell', qty: ctx.position };
  }
  if (ctx.price <= stop) {
    return { side:'sell', qty: ctx.position };
  }
  return null;
}
