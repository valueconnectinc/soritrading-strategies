/*
 * @coinsori-strategy v1
 * name: 1D Multi-Asset Momentum Crash-Stop
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: a tight trailing stop (tried before) whipsaws on normal
 * bull dips and made things worse. The champion's slow exit is actually good
 * for riding pullbacks — its only real flaw is that it holds through genuine
 * crashes (COVID 2020, 2021 top) and gives back huge chunks. This version
 * keeps the slow exit but adds a WIDE crash-only stop: exit early if price
 * closes 18% below its highest close of the last 60 days — a level normal
 * pullbacks never reach, only real crashes.
 * When it buys and sells: buy BTC/ETH/SOL when 90d momentum > +20%, price
 * above the 200-day average, and the Fed is not hiking. Sell when price
 * closes 18% or more below its 60-day high (crash), or when momentum fades
 * below +5%, or when price breaks the 200-day average.
 * When it does NOT work: in a Fed-easing bear it has no protection; and if
 * the market enters a long slow bleed without a single 18% crash-day, the
 * wide stop never fires and it behaves like the champion.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // 60-day highest close (closed bars only) for the crash stop.
  // 18% trail: normal bull pullbacks are 5-15%, real crashes are 30%+.
  let hi = -Infinity;
  for (let k = 2; k <= 61; k++) {
    const c = closes[closes.length - k];
    if (c != null && c > hi) hi = c;
  }
  const crashLevel = hi * 0.82;

  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (prevClose < crashLevel || prevClose < sma200 || roc90 < 5)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 };
  }
  return null;
}
