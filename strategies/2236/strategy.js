/*
 * @coinsori-strategy v1
 * name: DOGE Dual-Mode Mean Reversion 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure BB+RSI dip-buy defends crashes well but sits in cash
 * during bulls and misses the melt-up. This keeps mean reversion in BOTH modes
 * (no trend-following, which failed on DOGE) but adapts the entry to the regime:
 * in an uptrend it buys pullbacks back down to the middle band (continuation
 * dips), and in a downtrend/range it only buys oversold lower-band dips (crash
 * defense). Both entries are mean-reversion — buy weakness toward the mean.
 * When it buys and sells: UPTREND (above 200-SMA) — buy a pullback when price
 * falls to the middle band with RSI neutral, ride while above the band, exit if
 * it breaks below. DOWNTREND — buy only an oversold lower-band dip near the long
 * mean, sell at the middle band / overbought / ATR stop.
 * When it does NOT work: in a choppy sideways market that oscillates around the
 * 200-SMA the mode flips often and the pullback-buy can enter into a failing
 * bounce; a sharp reversal right after a pullback-buy loses more than cash.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null) return null;

  const trendUp = price > sma200;

  if (trendUp) {
    // UPTREND: buy pullbacks down to the middle band (continuation dip).
    if (pos <= 0) {
      // price pulled back to/just below the mean but not oversold-crashing
      if (price <= bb.mid && price > sma200 * 0.97 && rsi < 55) {
        return { side: 'buy', qty: (cash / price) * 0.98 };
      }
      return null;
    } else {
      // exit if price falls back through the middle band on weakness
      if (price < bb.mid - 0.5 * atr || rsi > 70) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
  }

  // DOWNTREND/RANGE: only oversold lower-band dips near the long mean (crash defense).
  if (pos <= 0) {
    if (price < bb.lower && rsi < 35 && price > sma200 * 0.97) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
