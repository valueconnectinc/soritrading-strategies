/*
 * @coinsori-strategy v1
 * name: Donchian Breakout Trend
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In crypto, a strong breakout to a multi-month high tends to keep
 * trending — the classic turtle breakout bet; we ride it with a wide stop.
 * When it buys and sells: Buys when price breaks above the highest high of the last 55
 * days while the 200-day trend is up. Sells when price closes back below the middle of the
 * channel, or drops 2x ATR below the entry (hard stop). Position is HALVED when volatility
 * is high (ATR > 5% of price) so we risk less in wild markets.
 * When it does NOT work: In long sideways ranges false breakouts trigger repeated small
 * losses (whipsaw). Expect losses in chop; this is a trend-only strategy.
 */
function onUpdate(ctx) {
  const n = 55;          // Donchian channel length — classic turtle 55-day breakout
  const trend = 200;     // long-term trend filter — only take breakouts above it
  const stopMult = 2.0;  // stop distance in ATR units — wide enough to survive normal noise
  const atrN = 14;
  const volThresh = 0.05; // ATR as fraction of price above which we halve size (prior test: robust)
  const sizeCut = 0.5;    // half position in high-volatility regimes

  const price = ctx.price;
  const pos = ctx.position;

  const upper = ctx.high(n);
  const lower = ctx.low(n);
  const atr = ctx.atr(atrN);
  const ema200 = ctx.ema(trend);
  if (upper == null || lower == null || atr == null || ema200 == null) return null;

  const prevUpper = ctx.high(n, 1); // Donchian high of the last CLOSED bar
  if (prevUpper == null) return null;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: prevUpper, trigger: 'above', note: '55d high breakout' }]);
    if (price > prevUpper && price > ema200) {
      // Vol-adaptive sizing: risk less when the market is swinging wildly.
      const size = (atr / price) > volThresh ? sizeCut : 0.99;
      return { side: 'buy', qty: ctx.cash / price * size };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr;
  const mid = (upper + lower) / 2;
  const prevClose = ctx.closes.at(-2);
  ctx.watch([
    { side: 'sell', price: stopPx, trigger: 'below', note: 'ATR stop' },
    { side: 'sell', price: mid, trigger: 'below', note: 'channel mid fail' }
  ]);
  if (price <= stopPx) return { side: 'sell', qty: pos };
  if (prevClose != null && prevClose < mid) return { side: 'sell', qty: pos };
  return null;
}
