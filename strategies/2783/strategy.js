/*
 * @coinsori-strategy v1
 * name: Onchain-Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Network activity (number of active addresses) is a
 * fundamental demand proxy that leads price. When adoption is growing (active
 * addresses above their own 30-day average) at the same time price is above a
 * medium trend, the rally has real users behind it and tends to continue. This
 * is a different signal source than pure price momentum.
 * When it buys and sells: buys when price is above the 50-day average AND
 * active addresses are above their 30-day average (both demand and price agree
 * the trend is up). Sells when price falls back below the 20-day average
 * (fast exit) or active addresses drop back below their 30-day average (the
 * demand support is gone).
 * When it does NOT work: in a bear market, price can stay below the 50-day
 * average for a long time so it stays flat (good defense but no return); and
 * on-chain data is not available for the earliest bars, so it cannot trade
 * before that data starts.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  if (ema20 == null || ema50 == null) return null;

  // On-chain demand: active addresses vs their own 30-day average.
  const addrRaw = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  const a = Number(addrRaw);
  const s = Number(addrSma);
  const demandUp = Number.isFinite(a) && Number.isFinite(s) && s > 0 && a > s;

  if (pos > 0) {
    // Exit fast on trend break or when demand support disappears.
    if (price < ema20 || !demandUp) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter when price trend is up AND on-chain demand is rising.
  if (demandUp && price > ema50) {
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
