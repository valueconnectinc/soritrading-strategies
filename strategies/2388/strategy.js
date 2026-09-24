/*
 * @coinsori-strategy v1
 * name: BNB Volume-Confirmed Trend 1D
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A rising trend is only trustworthy when real volume confirms it —
 * a price move on light volume is weak and easily reversed. This buys BNB when the
 * short-term average is above the long-term average (uptrend) AND today's volume is above
 * its own average (real participation). It uses volume as a confirmation signal, a different
 * family from pure price-trend strategies.
 * When it buys and sells: Buy when EMA(21) is above EMA(50) for the last two closed bars AND
 * volume is above its 20-day average. Sell when the trend breaks (EMA21 falls below EMA50).
 * When it does NOT work: In choppy sideways markets the two averages keep crossing, causing
 * repeated small whipsaw losses; and requiring above-average volume on the entry day can make
 * it late to the start of a quiet rally.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 80) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const ema21a = ctx.ema(21, 1);
  const ema21b = ctx.ema(21, 2);
  const ema50 = ctx.ema(50, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (px == null || ema21a == null || ema21b == null || ema50 == null ||
      vol == null || avgVol == null || avgVol <= 0) return null;

  const pos = ctx.position;
  const trendUp = ema21a > ema50 && ema21b > ema50; // confirm over two bars to cut noise
  const volumeConfirm = vol > avgVol * 1.2; // 20% above average = real participation

  if (pos === 0) {
    if (trendUp && volumeConfirm && ctx.price > 0) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit when the short-term average falls back below the long-term average.
  if (ema21a < ema50) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
