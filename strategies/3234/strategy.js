/*
 * @coinsori-strategy v1
 * name: BNB 1D Band-Bounce Mean Reversion
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: after a strong uptrend (rising 200-day average), a sharp one-day
 * drop to the lower Bollinger band with RSI oversold tends to snap back — BNB has
 * repeated this pattern through its history. This is the opposite bet to the momentum
 * champion: it buys weakness, not strength.
 * When it buys and sells: buys when price closes below the lower Bollinger (20,2.5)
 * with RSI<30, or below the Keltner low (EMA20 − 2.5·ATR) with RSI<40, only while the
 * 200-day average is RISING. Sells when price closes back above the 20-day EMA, or
 * when price falls 2.5 ATR below the highest close since entry.
 * When it does NOT work: in a straight-line bear (200-day average falling) it stays
 * flat and misses nothing — but it also misses the melt-up leg of a V-recovery if the
 * 200-day average is still falling at the bottom. In a grinding sideways market with
 * no dips it has nothing to buy.
 */
function onUpdate(ctx) {
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

  const pos = ctx.position;
  if (pos > 0) {
    // Trail anchored to the highest close since entry (2.5 ATR is the validated width).
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 2.5 * atr;
    if (price < trailStop || price > ema20) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;
  const buyQty = ctx.cash / price * 0.98;
  if (price < lowerBand && rsi < 30) {
    ctx.state.peak = price;
    return { side: 'buy', qty: buyQty };
  }
  if (price < keltnerLow && rsi < 40) {
    ctx.state.peak = price;
    return { side: 'buy', qty: buyQty };
  }
  return null;
}
