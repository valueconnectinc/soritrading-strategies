/*
 * @coinsori-strategy v1
 * name: Dual Trend Filter Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses two simple moving averages to determine trend direction and enters trades only in the
 * direction of the stronger trend. It also incorporates a volume filter to confirm the strength of the move.
 *
 * When it buys: It enters long when both SMAs (20 and 50) are rising, with volume above average.
 * When it sells: It exits long positions when either SMA starts to fall or volume drops below average.
 * When it does NOT work: The strategy fails in choppy markets where neither trend is clearly dominant,
 * or during strong directional moves that don't align with the moving average logic.
 */

function onUpdate(ctx) {
  // --- Get indicators ---
  const sma20 = ctx.sma(20, 0);
  const sma50 = ctx.sma(50, 0);
  const sma20_prev = ctx.sma(20, 1);
  const sma50_prev = ctx.sma(50, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // --- Guard against null values ---
  if (sma20 == null || sma50 == null || sma20_prev == null || sma50_prev == null || vol == null || avgVol == null) {
    return null;
  }

  // --- Define trend conditions ---
  const trendUp = (sma20 > sma50) && (sma20_prev <= sma50_prev);
  const trendDown = (sma20 < sma50) && (sma20_prev >= sma50_prev);

  // --- Volume filter ---
  const volAboveAvg = vol > avgVol;

  // --- Entry logic ---
  if (trendUp && volAboveAvg && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // --- Exit logic ---
  if ((trendDown || !volAboveAvg) && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // --- No action ---
  return null;
}
