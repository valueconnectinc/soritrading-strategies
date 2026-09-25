/*
 * @coinsori-strategy v1
 * name: XRP 1D Short Mean-Reversion (Fade Overbought)
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The long-only band-bounce buys deep panic dips and wins
 *   in down markets. This is the OPPOSITE side of the same mean-reversion
 *   coin: short overbought spikes above the upper Bollinger band, betting the
 *   price snaps back to the mean. A genuinely different mechanism (short
 *   reversal vs long reversal) that can profit in the same choppy regimes.
 * When it buys and sells: Short when the close is above the upper Bollinger
 *   band AND RSI(2) is overbought. Cover when price falls back to the 20-SMA
 *   or RSI drops below 45. A 8% hard stop caps squeeze damage.
 * When it does NOT work: In a strong sustained uptrend, overbought stays
 *   overbought and shorts get squeezed hard — this is the mirror-image risk
 *   of the long version lagging bull runs. It loses in melt-ups.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.upper == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position; // negative = short

  if (pos < 0) {
    // cover: reverted to the 20-SMA, RSI cooled, or hard stop
    if (price > ctx.entryPx * 1.08) return { side: 'buy', qty: -pos };
    if (rsi < 45 || price < sma) return { side: 'buy', qty: -pos };
    return null;
  }

  // overbought spike above the upper band
  if (price > bb.upper && rsi > 70) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
