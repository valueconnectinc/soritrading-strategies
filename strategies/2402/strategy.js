/*
 * @coinsori-strategy v1
 * name: BTC Regime Trend + On-Chain Sizing 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The price-only regime-trend recipe rides crypto bulls but loses in
 * long bears like 2021-2022. Bitcoin's network fundamentals — hashrate (miner commitment)
 * — tend to contract in those bear regimes. This strategy keeps the proven trend recipe
 * but uses on-chain network growth as a SIZING lever: it cuts position size when the
 * network is contracting, so it participates fully in bulls but bleeds less in bears.
 * This is a genuinely different data source (network fundamentals, not price math).
 * When it buys and sells: Buy when the last closed price is above its 50-day average,
 * sized down when volatility is high or the network is contracting (hashrate below its
 * 30-day average). Sell when price closes 1 ATR below the average (ignore small chop),
 * or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: In a speculation-driven bull where price runs up without network
 * growth, the sizing lever holds us at partial size and we lag the pure trend strategy.
 * On-chain data is slow-moving, so it cannot catch fast reversals; and it is a long-only
 * strategy so it does not profit from shorting bears.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // Volatility-scaled sizing: compare today's ATR/price to its 50-bar average.
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  // On-chain network-growth lever: when hashrate is below its 30-day average the network
  // is contracting (bear regime) — cut size to 50%. Missing data falls back to full size.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  if (hr != null && hrSma != null && hrSma > 0 && hr < hrSma) {
    sizeMult *= 0.5; // network contracting -> halve exposure in the bear regime
  }

  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
