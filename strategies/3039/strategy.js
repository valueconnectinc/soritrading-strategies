/*
 * @coinsori-strategy v1
 * name: BTC 1D Volatility-Targeted Long
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive mean-reversion champion (3037) is
 * excellent in pullbacks and bears but lags buy-and-hold in relentless melt-ups
 * because it sits in cash. Plain momentum (buying strength) whipsaws and bleeds
 * in crashes. This is a third, genuinely different family: a risk-managed
 * PERMANENT LONG. It stays invested so it captures the melt-up the MR champion
 * misses, but sizes the position inversely to volatility (small in wild markets,
 * large in calm) and exits entirely to cash when a crash regime is confirmed, so
 * it does not blow up like the momentum variants.
 * When it buys and sells: Always wants to be long when price is above the 200-day
 * average (confirmed bull), with position size = risk budget / ATR (inverse
 * volatility). It exits to cash when price closes below the 200-day average AND
 * volatility is elevated (a confirmed bear/crash regime) — the only time it is
 * fully out. It re-enters when price reclaims the 200-day average.
 * When it does NOT work: In a slow grind DOWN where price stays below the 200-day
 * average for months it stays in cash and misses any bounce. In a choppy
 * sideways market near the 200-day average it flips in and out. It is not a
 * market-timer: a sharp V-recovery after a crash re-enters late and misses the
 * first leg.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const atrNorm = ctx.atr(14, 1) / price; // ATR as % of price (normalised vol)
  if (sma200 == null || atr == null || atr <= 0 || !Number.isFinite(atrNorm) || atrNorm <= 0) return null;

  const bull = price > sma200;

  // Crash regime: below the 200-day average AND volatility elevated (ATR > ~5%).
  // 5% daily ATR is roughly the 90th percentile for BTC — a confirmed panic.
  const crash = !bull && atrNorm > 0.05;

  if (pos > 0) {
    // Exit to cash only in a confirmed crash regime (below 200d + high vol).
    if (crash) {
      return { side: 'sell', qty: pos };
    }
    // Otherwise re-scale toward the target size each bar.
    const riskBudget = 0.02 * ctx.cash;
    let targetQty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    targetQty = Math.min(targetQty, maxQty);
    if (targetQty > pos) {
      return { side: 'buy', qty: Math.min(targetQty - pos, maxQty) };
    }
    if (targetQty < pos) {
      return { side: 'sell', qty: pos - targetQty };
    }
    return null;
  }

  // Flat: re-enter when back in a bull regime (above 200d), sized to volatility.
  if (bull) {
    const riskBudget = 0.02 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
