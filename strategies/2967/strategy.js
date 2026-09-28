/*
 * @coinsori-strategy v1
 * name: DOGE 1D ATR-Adaptive Keltner MR
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe has been
 * validated positive on nearly every window across 6 assets (BTC/ETH/SOL/LINK/ADA/BNB).
 * DOGE is a high-beta meme alt that pulls back hard and snaps back violently, which
 * is exactly the regime this defensive family exploits. This tests whether the
 * cross-asset generalization extends to a 7th, higher-volatility asset.
 * When it buys and sells: Buys an oversold flush below the ATR-adaptive lower Keltner
 * band (EMA20 - 2.5x ATR) with RSI<40 inside a rising 200-day uptrend, sized to
 * nearly full cash. Sells on snap-back above the mid band (EMA20) or RSI above 60.
 * When it does NOT work: In a broad crypto bear DOGE falls hardest and the 200-day
 * gate keeps it out of most trades (capital-preserving but captures little). It
 * badly lags buy-and-hold in a relentless meme melt-up because it sits in cash
 * waiting for a pullback. DOGE's extreme volatility can still produce sharp
 * drawdowns on the trades it does take.
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
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
