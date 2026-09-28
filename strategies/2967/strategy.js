/*
 * @coinsori-strategy v1
 * name: DOGE 1D ATR-Adaptive Keltner MR (Risk-Sized)
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is the one
 * robust edge in this ledger — positive on nearly every window across 6+ assets.
 * DOGE is the highest-beta asset in the family, so this version keeps the exact
 * proven entry/exit but sizes each position by its own volatility (ATR) instead
 * of buying near-full cash. A fixed risk per trade means a wild DOGE flush risks
 * the same dollar amount as a calm one, cutting drawdown without changing the edge.
 * When it buys and sells: Buys an oversold flush below the ATR-adaptive lower Keltner
 * band (EMA20 - 2.5x ATR) with RSI<40 inside a rising 200-day uptrend. Position is
 * sized so a 2.5-ATR adverse move equals a fixed 1.5% of equity. Sells on snap-back
 * above the mid band (EMA20) or RSI above 60.
 * When it does NOT work: In a broad bear DOGE falls hardest and the 200-day gate keeps
 * it out of most trades (capital-preserving but captures little). It lags buy-and-hold
 * in a relentless meme melt-up because it sits in cash waiting for a pullback. Risk
 * sizing keeps drawdown low but also caps the size of winning trades on calm entries.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null) return null;

  const lowerBand = ema20 - 2.5 * atr;
  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    if (price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (uptrend && price < lowerBand && rsi < 40) {
    // Size so a 2.5-ATR adverse move = 1.5% of equity (risk-based sizing).
    // DOGE is high-beta, so this keeps every trade's dollar risk equal.
    const riskPerTrade = 0.015;
    const stopDist = 2.5 * atr;
    const qty = (ctx.cash * riskPerTrade) / stopDist;
    return { side: 'buy', qty: Math.min(qty, (ctx.cash / price) * 0.95) };
  }
  return null;
}
