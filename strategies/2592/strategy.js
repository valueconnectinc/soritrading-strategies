/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Contrarian sentiment mean-reversion with a trend filter.
 * Bitcoin crowds get irrationally fearful at bottoms and greedy at tops. The
 * Fear & Greed index (0-100) quantifies this. But buying deep fear blindly
 * catches falling knives in persistent bears, so we only fade fear when the
 * long-term trend is still up (price above 200-day SMA) — deep fear in an
 * uptrend is a dip-buying opportunity, not a knife-catch. Different family
 * from trend-following Donchian, giving portfolio diversity.
 * When it buys and sells: buys when index<20 AND price>200-day SMA; exits
 * when index turns greedy (>60) or a 3x-ATR stop hits.
 * When it does NOT work: in prolonged bear markets the 200-day filter keeps
 * it in cash (misses nothing but also no dips to buy); in a bull that breaks
 * down it can still catch a dip that keeps falling. Requires agent online.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null; // data unavailable -> stay flat, no signal

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (fg > 60) return { side: 'sell', qty: pos };
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  // Only fade fear when the long-term trend is intact (price above 200-day
  // SMA). Without this, buying deep fear in a bear = catching a falling knife.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  if (price < sma200) return null;

  if (fg < 20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
