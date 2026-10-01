/*
 * @coinsori-strategy v1
 * name: Defensive Mean Reversion BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC tends to snap back up after sharp, oversold flush drops when
 * the long-term trend is still intact. Buying those panic dips and selling after a
 * recovery is a defensive way to profit without chasing melt-ups.
 * When it buys and sells: it buys only when price is far below its 200-day average AND
 * RSI is very oversold (deep dip). It sells once price climbs back above its 20-day
 * average (recovered) or when the long-term trend turns down.
 * When it does NOT work: in a long melt-up it stays flat (no dips to buy) and lags
 * buy-and-hold; in a sustained bear market the trend gate keeps it mostly in cash so
 * it protects capital but makes little. It is defensive, not a momentum winner.
 */

function onUpdate(ctx) {
  // ---- trend gate: only buy when the long-term trend is up ----
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;

  // ---- indicators for entry/exit (use closed bars, ago>=1, so live==backtest) ----
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  if (bb == null || rsi == null || ema20 == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // Exit: recovered above 20-day average, OR long-term trend broke down.
    // Selling on recovery locks in the mean-reversion gain instead of riding back down.
    if (price < sma200 || price > ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // ---- entry: deep oversold flush while trend is up ----
  // RSI<30 = oversold panic; price below lower Bollinger band = stretched dip.
  // Only enter when the 200-day trend is still rising so we don't catch falling knives.
  const sma200Prev = ctx.sma(200, 2);
  if (sma200Prev == null) return null;
  const trendUp = sma200 > sma200Prev && price > sma200 * 0.85;

  if (trendUp && rsi < 30 && price < bb.lower) {
    // Size a bit less than full to leave room for fees.
    return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
  }

  return null;
}
