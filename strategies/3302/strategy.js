/*
 * @coinsori-strategy v1
 * name: BTC Sentiment Contrarian 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto sentiment swings to extremes; buying when the Fear & Greed
 * index hits extreme fear, while the long-term trend is still up, has historically given
 * good risk/reward (contrarian dip-buy, not bottom-picking in a bear market).
 * When it buys and sells: Buy when F&G index < 25 (extreme fear) AND the 200-day EMA is
 * rising. Sell when F&G >= 75 (extreme greed) or price falls 25% below entry (hard stop).
 * When it does NOT work: prolonged bear markets where extreme fear keeps being followed
 * by lower prices — the EMA200 gate is what keeps it out, but if that gate fails the stop
 * limits damage. Also flat ranges where the index wobbles around thresholds.
 */
function onUpdate(ctx) {
  // Sentiment trigger — daily fear & greed index aligned to bar timestamps
  const fg = ctx.data('fg');
  if (fg == null) return null; // dataset unavailable: do nothing

  // Trend gate on CLOSED bars (ago 1 vs 2 identical in backtest/live)
  const e200_1 = ctx.ema(200, 1);
  const e200_2 = ctx.ema(200, 2);
  if (e200_1 == null || e200_2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos > 0) {
    const entry = ctx.entryPx || price;
    // 25% hard stop: wide enough to survive normal volatility, catches real crashes
    if (price <= entry * 0.75) return { side: 'sell', qty: pos };
    // take profit on extreme greed
    if (fg > 75) return { side: 'sell', qty: pos };
    ctx.watch([{ side: 'sell', price: entry * 0.75, trigger: 'below', note: 'hard stop' },
               { side: 'sell', conds: [{ label: 'F&G', now: fg, op: '>', ref: 75, closed: true }] }]);
    return null;
  }

  // buy extreme fear only when the long trend is intact
  if (fg < 25 && e200_1 > e200_2) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  ctx.watch([{ side: 'buy', conds: [{ label: 'F&G', now: fg, op: '<', ref: 25, closed: true },
                                    { label: 'EMA200 rising', ok: e200_1 > e200_2 }] }]);
  return null;
}
