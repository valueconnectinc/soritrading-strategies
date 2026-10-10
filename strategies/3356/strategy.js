/*
 * @coinsori-strategy v1
 * name: SOL Volatility Squeeze Breakout 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Big directional moves in SOL usually start from a period of very low
 * volatility (a "squeeze" of the Bollinger Bands). Waiting for a close above the upper band
 * that comes out of a squeeze, and only in an uptrend, buys the start of a trend instead of
 * chasing it. This is a different edge from the RSI2 panic-dip champion: it catches the
 * momentum side, not the capitulation side. A 2.5 ATR trailing stop lets winners run while
 * capping how much of a peak is given back, and a hard stop limits the loss on any single
 * fakeout.
 * When it buys and sells: Buys when the daily close rises above the 20-day upper Bollinger
 * band AND the band width two days earlier was in the bottom 30% of its 100-day history
 * (a squeeze) AND price is above the 200-day average. Sells when price falls 2.5 ATR below
 * the highest close since entry (trailing stop) or falls 1.0 ATR below entry (hard stop).
 * When it does NOT work: In a choppy sideways market breakouts fake out and the stops take
 * small losses repeatedly. In a strong bull it can still give back part of a move before the
 * stop triggers. No data before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;
  const st = ctx.state;
  const pos = ctx.position;

  const bb = ctx.bb(20, 2, 1);       // yesterday's bands
  const bbPrev = ctx.bb(20, 2, 2);   // two days ago bands (squeeze measured here)
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const lastClose = ctx.closes.at(-2);
  if (bb == null || bbPrev == null || atr == null || sma200 == null || lastClose == null) return null;

  // Rolling history of BB widths (fraction of mid) to judge "squeeze" vs normal.
  const widthPrev = (bbPrev.upper - bbPrev.lower) / bbPrev.mid;
  if (!st.widths) st.widths = [];
  st.widths.push(widthPrev);
  if (st.widths.length > 100) st.widths.shift();
  if (st.widths.length < 60) return null;   // need ~3 months of width history

  // Percentile of the pre-breakout width within the last 100 bars (bottom 30% = squeezed).
  let below = 0;
  for (const w of st.widths) if (w <= widthPrev) below++;
  const pct = below / st.widths.length;

  if (pos > 0) {
    if (st.peak == null || lastClose > st.peak) st.peak = lastClose;
    // 2.5 ATR trailing stop rides trends; the 1.0 ATR hard stop below entry caps any single
    // fakeout loss (never risk more than ~1 day's range on a trade).
    const trail = st.peak - 2.5 * atr;
    const hardStop = (st.entryPx || price) - 1.0 * atr;
    const stop = Math.max(trail, hardStop);
    ctx.watch([{ side: 'sell', price: stop, trigger: 'below', note: 'ATR stop' }]);
    if (price <= stop) return { side: 'sell', qty: pos };
    return null;
  }

  // Entry: yesterday closed above its upper band, coming out of a squeeze (width two days
  // ago in the bottom 30% of its 100-bar history), and only above the 200-day average so we
  // never buy breakdowns in a bear market.
  if (lastClose > bb.upper && pct <= 0.30 && lastClose > sma200) {
    st.entryPx = price;
    st.peak = lastClose;
    const qty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: qty };
  }
  return null;
}
