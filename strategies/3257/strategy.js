/*
 * @coinsori-strategy v1
 * name: btc_onchain_meanrev_1d
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC pullbacks inside a healthy network-growth regime tend to bounce.
 * I use on-chain data (hashrate expanding = miners committed, active addresses rising =
 * adoption) as a fundamental regime filter, and only fade oversold dips when the network
 * is still growing. This is different from pure price mean-reversion.
 * When it buys and sells: buys when RSI is oversold while hashrate is above its 30-day
 * average (network growing) and price is above the 200-day average; sells when RSI recovers
 * to neutral/overbought.
 * When it does NOT work: if hashrate falls (miner capitulation) or price breaks below the
 * 200-day average, the dip is not a bounce but a regime change — this loses in genuine
 * bear markets and during mining crackdowns.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  if (rsi == null || sma50 == null || sma200 == null) return null;

  // On-chain regime filter (user's connected DB datasets). null = data unknown, sit out.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  if (hr == null || hrSma == null) return null;

  const networkGrowing = hr > hrSma;
  const adoptionGrowing = addr == null || addrSma == null ? true : addr > addrSma;

  if (ctx.position > 0) {
    // Exit: RSI back to neutral = the panic bounce is done.
    if (rsi >= 55) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Long-term uptrend required (price above 200d mean) — avoid catching knives in bear markets.
  if (px <= sma200) return null;
  // Network must still be expanding — hashrate falling = miners leaving, no bounce support.
  if (!networkGrowing || !adoptionGrowing) return null;

  // Oversold dip: RSI < 30 and price below the 50-day mean.
  if (rsi < 30 && px < sma50 * 0.97) {
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
