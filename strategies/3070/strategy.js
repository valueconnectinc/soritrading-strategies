/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Risk-Scaled (upbit)
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: The validated BTC 1D Dual-MR champion (binance 3033) only buys deep
 * oversold flushes inside a rising 200-day average, and sizes each rare entry inversely to
 * ATR to cap drawdown. This is the same champion logic run on upbit BTC 1d to test whether
 * the edge transfers to the KRW market with the available data, and to compare directly
 * against the stop-protected bear variant on identical data.
 * When it buys and sells: Buy when price closes below the lower Bollinger (20,2.5) with
 * RSI<30, OR below the ATR-adaptive Keltner low with RSI<40, only inside a rising 200-day
 * average. Size = 2.5% risk budget divided by ATR. Sell on snap-back above the 20-day EMA
 * or when RSI climbs above 55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps it flat (little
 * upside), and it lags buy-and-hold in a relentless melt-up.
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
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
