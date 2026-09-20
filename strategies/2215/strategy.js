/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Target AdaptiveCrash 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: improvement on the validated SOL trend-gated vol-target
 * champion. The original used a FIXED 12% crash threshold, which is too tight for
 * SOL's high volatility (normal dips trigger the full exit and whipsaw) and too
 * loose in fast crashes. This version scales the crash threshold with ATR so the
 * exit adapts to the actual volatility regime.
 * When it buys and sells: above SMA50 = fully invested. Below SMA50 but within an
 * ATR-scaled band = ATR vol-target (2% daily). Beyond the ATR-scaled crash band =
 * fully to cash.
 * When it does NOT work: SOL's volatility still means deep drawdowns in violent
 * bull corrections; a fast V-shaped recovery can sell near the bottom and miss the
 * bounce. Adaptive threshold reduces but does not eliminate whipsaw.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  // ATR-scaled crash band: 3.0 ATRs below the SMA50. Chosen so normal SOL dips
  // (1-2 ATR) stay in the vol-target regime and only a genuine crash (>3 ATR)
  // triggers the full exit — replaces the fixed 12% that whipsawed in bull dips.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // mild downtrend: vol-target
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
