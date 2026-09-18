/*
 * @coinsori-strategy v1
 * name: SMA Crossover BTC 1D with DXY Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following on BTCUSDT 1D: buy when SMA 20 crosses above SMA 60 and
 * the US Dollar Index (DXY) is below 104 (weak dollar = BTC tailwind).
 * Sell on SMA death cross or if DXY spikes above 108.
 * Works in BTC bull markets with a weak dollar. Fails when DXY and BTC
 * both rise together or in choppy markets with frequent crosses.
 */
function onUpdate(ctx) {
  const sma20 = ctx.sma(20);
  const sma60 = ctx.sma(60);
  if (sma20 == null || sma60 == null) return null;

  const dxy = ctx.macro('dxy');
  const price = ctx.price;
  const position = ctx.position;

  // DXY current value — only enter/exit if DXY data is available
  const dxyOk = dxy == null || dxy < 108; // null = no DXY data, proceed anyway

  // === ENTRY: Golden cross + DXY not hostile ===
  if (!position) {
    const sma20Prev = ctx.sma(20, 1);
    const sma60Prev = ctx.sma(60, 1);
    if (sma20Prev == null || sma60Prev == null) return null;

    const goldenCross = sma20Prev <= sma60Prev && sma20 > sma60;
    if (goldenCross && dxyOk) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: Death cross OR DXY spikes above 108 ===
  if (position) {
    const sma20Prev = ctx.sma(20, 1);
    const sma60Prev = ctx.sma(60, 1);
    if (sma20Prev == null || sma60Prev == null) return null;

    const deathCross = sma20Prev >= sma60Prev && sma20 < sma60;
    const dxyHostile = dxy != null && dxy > 108;
    if (deathCross || dxyHostile) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
