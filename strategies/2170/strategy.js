/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto markets swing between panic and euphoria, and the
 * Fear & Greed index (0-100, from the user's connected data) is a sentiment
 * thermometer. Contrarian logic: extreme fear means sellers are exhausted and
 * prices are beaten down, so it is a good time to buy; extreme greed means the
 * crowd is over-leveraged long, so it is a good time to take profit.
 * When it buys and sells: buy when the index drops into extreme fear (<20),
 * sell when it climbs into extreme greed (>75) or after holding too long
 * without a profit. Position sized so a single bad trade costs ~5% of cash.
 * When it does NOT work: in a sustained bear market the index can stay in fear
 * for months while price keeps falling (buying too early), and it gives back
 * gains by selling before the top of a long euphoric bull run.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  // fg is null until the user's agent feeds a value — do nothing until then
  if (fg == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  const entry = ctx.entryPx;

  if (pos <= 0) {
    // Buy only in extreme fear. Threshold 20 = classic panic zone.
    if (fg <= 20) {
      // risk 5% of cash on a 10% adverse move -> qty = 0.5*cash/price
      const qty = (cash / price) * 0.5;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // In position: take profit in extreme greed (75), or stop out on a
    // hard loss (-15%) so a long fear period cannot bleed us dry.
    const pnlPct = entry && entry > 0 ? (price - entry) / entry : 0;
    if (fg >= 75 || pnlPct <= -0.15) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
