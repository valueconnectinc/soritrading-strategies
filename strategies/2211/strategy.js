/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Target FearGreed Filter 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated SOL trend-gated vol-target champion (2209)
 * beats buy-and-hold on every window but carries a deep 59% drawdown because it
 * stays 100% invested into euphoric bull tops. This version layers a Fear & Greed
 * sentiment filter on top: when the index is in extreme greed (euphoria, where
 * tops form), it cuts to the vol-target exposure instead of full size, so it
 * stops buying at the top and gives back less in the crash that follows.
 * When it buys and sells: above SMA50 and not euphoric = fully invested. Above
 * SMA50 but extreme greed (index >= 85) = ATR vol-target (2% daily) to avoid the
 * top. Below SMA50 = vol-target; beyond the ATR-scaled crash band = cash.
 * When it does NOT work: SOL's volatility still means deep drawdowns in violent
 * bull corrections; extreme-greed periods can keep climbing for weeks, so cutting
 * size there sacrifices upside in a melt-up. The filter also needs the Fear & Greed
 * dataset loaded, or it silently runs at full size.
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

  // ATR-scaled crash band: 3.0 ATRs below the SMA50, same as the validated
  // champion — normal SOL dips (1-2 ATR) stay in vol-target, only a real crash
  // (>3 ATR) triggers the full exit.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  // Fear & Greed filter: only de-risk when the index is at extreme greed
  // (>=85, euphoria). The index is 0-100; 85 is the conventional "extreme greed"
  // zone where tops usually form. If the dataset is missing, run at full size.
  const fg = ctx.data('fear_greed');
  const euphoric = fg != null && fg >= 85;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp && !euphoric) {
    targetQty = equity / price; // uptrend, no euphoria: fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // euphoric top or mild downtrend: vol-target
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
