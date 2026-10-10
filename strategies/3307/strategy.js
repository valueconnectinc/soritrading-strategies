/*
 * @coinsori-strategy v1
 * name: BTC Hashrate-Regime Trend 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC network health (hashrate) confirms the price trend. When miners keep
 * committing hardware (hashrate above its 30-day average) AND price is above its 200-day
 * average, crypto bull trends tend to persist; when hashrate turns down, the regime is risky.
 * When it buys and sells: Buy BTC on days when price is above the 200-day average and hashrate
 * is above its 30-day average. Sell when price falls below the 50-day average, when hashrate
 * falls below its 30-day average, or when price drops 2.5x ATR below entry (hard stop).
 * When it does NOT work: In choppy sideways markets price whipsaws around the averages and the
 * strategy trades in and out repeatedly. It also lags the very start of a rally because it
 * waits for both price AND hashrate confirmation.
 */
function onUpdate(ctx) {
  // Closed-bar indicators so the logic is identical in backtest, paper and live.
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || sma50 == null || atr == null) return null;

  // Fundamental regime from the user's DB (BTC hashrate, daily).
  const hr = ctx.data('hashrate');
  const hr30 = ctx.data('hashrate_sma30');
  if (hr == null || hr30 == null) return null; // data missing = stay out, never assume

  const price = ctx.price;
  const prevClose = ctx.closes.at(-2);
  const pos = ctx.position || 0;

  // Hard stop: 2.5x ATR below entry protects every open trade from a crash.
  if (pos > 0) {
    if (price <= ctx.entryPx - 2.5 * atr) return { side: 'sell', qty: pos };
  }

  // Exit: trend broke (below 50d SMA) OR network regime turned down (hashrate < its 30d avg).
  if (pos > 0) {
    if (prevClose < sma50 || hr < hr30) return { side: 'sell', qty: pos };
    ctx.watch([{ side: 'sell', price: sma50, trigger: 'below', note: '50d SMA trend break',
                 conds: [{ label: 'Hashrate>30d avg', ok: hr > hr30 }] }]);
    return null;
  }

  // Entry: bull trend (price above 200d SMA) AND healthy network (hashrate above its 30d avg).
  if (prevClose > sma200 && hr > hr30) {
    ctx.watch([{ side: 'buy', price: sma200, trigger: 'above', note: '200d SMA reclaim',
                 conds: [{ label: 'Hashrate>30d avg', ok: hr > hr30 }] }]);
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
