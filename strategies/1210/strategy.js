/*
 * @coinsori-strategy v1
 * name: Bollinger Bands + RSI Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Mean reversion on ETH: buy when price bounces from lower Bollinger Band
 * with RSI confirming oversold. Sell when price reverts to middle band or
 * reaches upper band with RSI overbought.
 * When it underperforms: strong trending markets — price hugs the band and
 * never reverts, causing repeated small losses.
 */

function onUpdate(ctx) {
  // Warm-up: need 20 bars for BB, 14 for RSI
  const bb = ctx.bb(20, 2, 0);
  const rsi = ctx.rsi(14, 0);
  if (bb == null || rsi == null) return null;
  // Also need previous bar for confirmation
  const bb1 = ctx.bb(20, 2, 1);
  const rsi1 = ctx.rsi(14, 1);
  if (bb1 == null || rsi1 == null) return null;

  const { upper, middle, lower } = bb;
  const price = ctx.price;
  const pos = ctx.position;

  // ── ENTRY: price bounced off lower band, RSI was oversold on prev bar ──
  // Bounce = prev bar was at/below lower band, current bar is above it
  const prevBelow = bb1.lower >= ctx.closes[1];   // previous close ≤ lower BB
  const currAbove = price > lower;                  // current price above lower BB
  const rsiOversold = rsi1 < 35;                   // RSI was oversold on previous bar

  if (!pos && prevBelow && currAbove && rsiOversold) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── EXIT: price reached middle band OR upper band with overbought RSI ──
  if (pos) {
    const atMiddle = price >= middle;
    const atUpperWithOB = price >= upper && rsi > 65;
    const rsiOverbought = rsi > 75;

    if (atMiddle || atUpperWithOB || rsiOverbought) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
