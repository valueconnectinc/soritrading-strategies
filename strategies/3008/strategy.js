/*
 * @coinsori-strategy v1
 * name: ETH 1D Dual-MR Defensive Full-Cash
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The BTC 1D ledger shows defensive mean-reversion is the only robust
 * edge. This applies the exact same validated Dual-MR core (Bollinger-RSI flush OR
 * ATR-Keltner pullback, rising 200-day gate, full-cash sizing) to ETH 1D to test whether
 * the edge GENERALIZES beyond BTC — if it holds, the defensive MR edge is asset-independent,
 * not a BTC-specific artifact.
 * When it buys and sells: Buy when price closes below the lower Bollinger band (20,2.5)
 * with RSI<30, OR below the ATR-adaptive lower Keltner band with RSI<40, all only inside a
 * rising 200-day average. Size with ~95% of cash. Sell on the snap-back above the 20-day
 * EMA or when RSI climbs above 55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat, and it
 * lags buy-and-hold in a relentless melt-up. Full-cash sizing means a single wrong flush
 * costs more than a risk-sized version.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
