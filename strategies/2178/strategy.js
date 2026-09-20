/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout ATR-Trailing 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto's biggest gains come from long sustained trends.
 * A Donchian 55-day breakout catches the start of a bull run, but the plain
 * 30-day-low exit gives back too much on sharp corrections (high drawdown).
 * Adding an ATR-based trailing stop lets it lock in gains on sharp drops
 * while still riding the long trend — a classic turtle breakout with a
 * volatility stop.
 * When it buys and sells: buy with full cash when the daily close breaks
 * above the 55-day high. Sell when the close breaks below the 30-day low,
 * OR when the close drops more than 2.5x ATR(14) below the highest close
 * since entry (a sharp correction triggers an early exit to cut drawdown).
 * When it does NOT work: in a long sideways/choppy market it buys breakouts
 * that immediately reverse; the ATR stop can exit on normal volatility in a
 * strong trend and make it re-enter late. It still trails buy-and-hold in a
 * straight-line raging bull.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(30, 1);
  if (exitLow == null) return null;
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  if (pos <= 0) {
    if (price > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // track the highest close since entry to trail the ATR stop from
    let peak = ctx.state.peak || ctx.entryPx;
    const c = ctx.closes[ctx.closes.length - 1];
    if (c != null && c > peak) peak = c;
    ctx.state.peak = peak;

    // exit on 30-day low break OR a sharp 2.5x ATR drop from the peak
    const sharpDrop = c != null && c < peak - 2.5 * atr;
    if (price < exitLow || sharpDrop) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
