/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (SMA200 Entry Gate)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contracting
 * below its own recent average) is followed by a sharp expansion move. Betting
 * on the expansion side of the squeeze, confirmed by a volume surge, captures
 * the start of new directional trends. A 200-SMA entry gate blocks new buys in
 * confirmed downtrends where breakouts are usually bull traps.
 * When it buys and sells: on each symbol, buys when price is above the 200-SMA
 * AND band-width is below its 20-bar average AND price closes above the upper
 * Bollinger band AND volume > 1.5x its 20-day average. Exits on a 2.5x-ATR stop
 * or a 20-day low trail (unchanged from the proven champion).
 * When it does NOT work: choppy sideways markets where a squeeze resolves with a
 * failed breakout; it lags very strong straight-line bull runs because it waits
 * for fresh coiling. The 200-SMA gate also means it sits out the very start of a
 * new bull after a long bear (price must first climb back above the 200-SMA).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (bb == null || atr == null || vol == null || avgVol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // Entry gate: only buy in a confirmed uptrend (price above the 200-SMA).
  // This blocks bull-trap breakouts in bear markets (the champion's one losing window).
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null || price <= sma200) return null;

  // Squeeze: current band width is below its 20-bar average (coiling).
  const bw = (bb.upper - bb.lower) / bb.middle;
  let sum = 0, cnt = 0;
  for (let k = 1; k <= 20; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    sum += (b.upper - b.lower) / b.middle;
    cnt++;
  }
  if (cnt < 20) return null; // not enough history yet
  const avgBw = sum / cnt;
  if (bw >= avgBw) return null; // not coiling

  // Expansion trigger: volume surge + close above the upper band.
  if (vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
