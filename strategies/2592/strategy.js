/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Contrarian sentiment mean-reversion. Bitcoin crowds get
 * irrationally fearful at bottoms and irrationally greedy at tops. The Fear &
 * Greed index (0-100) quantifies this. Fading extremes — buying deep fear,
 * selling extreme greed — bets that sentiment reverts. This is a different
 * family from trend-following Donchian, giving portfolio diversity.
 * When it buys and sells: buys when the index is deeply fearful (<20) and
 * exits when it turns greedy (>60) or the trade is stopped out; sells short
 * when extremely greedy (>80).
 * When it does NOT work: in prolonged bull markets extreme fear is rare and
 * the strategy sits in cash missing the rally; in a crash the index can stay
 * fearful for a long time while price keeps falling (contrarian knife-catch).
 * Requires the agent online (reads ctx.data 'fg').
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null; // data unavailable -> stay flat, no signal

  const price = ctx.price;
  const pos = ctx.position;

  // Exit rules first: if we are long and sentiment turns greedy, take profit.
  if (pos > 0) {
    if (fg > 60) return { side: 'sell', qty: pos };
    // Hard stop to avoid catching a falling knife in a long fearful stretch.
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  // Contrarian long: buy deep fear (index < 20). Classic contrarian entry.
  if (fg < 20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
