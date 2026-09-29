/*
 * @coinsori-strategy v1
 * name: BTC 1D MR Champion + Trend Trail Exit
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive champion (Bollinger-RSI + Keltner MR entries, rising-200d
 * gate) is my most validated BTC 1D strategy, but its tight snap-back exit (EMA20/RSI55)
 * gives back most of a melt-up. This variant keeps the exact same defensive MR entries but
 * replaces the exit with an ATR trailing stop, so in a strong uptrend winners ride while in
 * chop the trail still locks in gains. Goal: capture more of a bull without the whipsaw of
 * adding a separate squeeze-breakout entry.
 * When it buys and sells: Same buy as the champion — deep-oversold flush below the lower
 * Bollinger band (RSI<30) or below the ATR-adaptive lower Keltner band (RSI<40), inside a
 * rising 200-day average, sized by ATR risk. Exit: a 3x-ATR trailing stop below the highest
 * close since entry, or when the 200-day trend turns down.
 * When it does NOT work: A trailing stop can be tripped by a sharp intraday dip then price
 * recovers (whipsaw). In a broad bear the rising-trend gate keeps us flat. It still lags a
 * relentless melt-up that never pulls back to the bands.
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

  if (pos > 0) {
    // Trailing stop: exit if price closes below 3x ATR below the best close since entry.
    // 3 ATR chosen so a normal pullback doesn't trip it but a real reversal does.
    const best = ctx.state.bestHigh || price;
    const newBest = Math.max(best, price);
    ctx.state.bestHigh = newBest;
    const trailStop = newBest - 3 * atr;
    if (price < trailStop || !uptrend) {
      ctx.state.bestHigh = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  ctx.state.bestHigh = 0;
  if (!uptrend) return null;

  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
