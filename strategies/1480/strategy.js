/*
 * @coinsori-strategy v1
 * name: RSI BB + EMA Trend Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure mean reversion works in uptrends but gets destroyed in downtrends.
 * This adds an EMA200 filter: only take long mean-reversion setups when
 * price is above EMA200 (market in structural uptrend). This avoids
 * catching falling knives in bear markets.
 * When it buys: Price > EMA200 + RSI < 33 + price at lower BB + volume.
 * When it sells: RSI > 67 OR price at upper BB.
 * When it fails: In strong uptrends that don't pull back to the lower BB,
 * this strategy sits out entirely and misses the move.
 */
function onUpdate(ctx) {
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  const ema200 = ctx.ema(200);
  if (rsi == null || bb == null || ema200 == null) return null;

  const price   = ctx.price;
  const lower   = bb.lower;
  const upper   = bb.upper;

  // Trend filter: only in uptrends
  const inUptrend = price > ema200;

  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.8;

  // Entry: uptrend + RSI oversold + at lower BB
  if (ctx.position === 0) {
    if (inUptrend && rsi < 33 && price <= lower && volOk) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // Exit: RSI overbought OR upper BB
  if (ctx.position > 0) {
    if (rsi > 67 || price >= upper) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
