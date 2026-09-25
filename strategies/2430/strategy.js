/*
 * @coinsori-strategy v1
 * name: ETH Volume-Confirmed Trend 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A price breakout is only trustworthy when real volume is
 *   behind it — thin, low-volume moves are often traps that reverse. This rides
 *   the EMA trend but only enters when trading volume is above its recent average,
 *   so it skips low-participation breakouts that tend to fail.
 * When it buys and sells: Buy when EMA50 is above EMA200 (uptrend) AND today's
 *   volume is above its 20-bar average (real participation). Sell when the uptrend
 *   breaks (fast EMA crosses below slow).
 * When it does NOT work: In calm, orderly trends where volume is steady but not
 *   spiking, the volume filter keeps it out of perfectly good moves. Choppy
 *   sideways markets still whipsaw.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (fast == null || slow == null || vol == null || avgVol == null) return null;

  const pos = ctx.position;

  // Exit: uptrend broken.
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: uptrend AND volume above average (real participation).
  if (fast > slow && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
