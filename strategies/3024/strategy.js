/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 6-Asset + Volume Capitulation
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT, ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated defensive mean-reversion recipe as the 6-asset champion,
 * but with one genuinely different signal mechanism: a volume filter on entry. The champion
 * buys every band flush, including low-volume drift dips that just bleed. Requiring the flush
 * bar to come on above-average volume (a real capitulation) should keep only the panic-flush
 * buys where mean reversion is strongest, and skip the quiet bleed.
 * When it buys and sells: Buy on each asset when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low with RSI<40, in a rising 200-day
 * average, AND the current bar's volume is above the 20-day average. Sell when price closes
 * back above the 20-day EMA, or drops 2.5 ATR from the highest close since entry.
 * When it does NOT work: In a straight-line melt-up it lags buy-and-hold, and in a broad
 * coordinated bear all gates stay flat (capital safe, little upside). The volume filter can
 * skip a genuine flush that happens on normal volume, missing entries the champion takes.
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
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    const trailStop = entry - 2.5 * atr;
    if (price > ema20 || price < trailStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Volume confirmation: current bar volume vs 20-bar average.
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null || avgVol <= 0) return null;
  // Require the flush bar to be a real capitulation: at least 1.5x the 20-day average volume.
  const volumeSurge = vol > 1.5 * avgVol;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if ((bollingerFlush || keltnerPullback) && volumeSurge) {
    const legCash = ctx.cash;
    const riskEq = 0.03 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
