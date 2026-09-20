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
 * sentiment filter on top: when the index shows high greed (where tops form), it
 * cuts to the vol-target exposure instead of full size, so it stops buying at the
 * top and gives back less in the crash that follows.
 * When it buys and sells: above SMA50 and not greedy = fully invested. Above
 * SMA50 but greedy (index >= 75) = ATR vol-target (2% daily) to avoid the top.
 * Below SMA50 = vol-target; beyond the ATR-scaled crash band = cash.
 * When it does NOT work: SOL's volatility still means deep drawdowns in violent
 * bull corrections; greed periods can keep climbing for weeks, so cutting size
 * there sacrifices upside in a melt-up. The filter also needs the Fear & Greed
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

  // Fear & Greed filter: de-risk when the index is at high greed (>=75).
  // 75 is the conventional "greed" zone — tops usually form as greed builds,
  // and this fires earlier than the extreme-greed (85) level so it trims size
  // before the melt-up peaks. If the dataset is missing, run at full size.
  const fg = ctx.data('fear_greed');
  const greedy = fg != null && fg >= 75;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp && !greedy) {
    targetQty = equity / price; // uptrend, not greedy: fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // greedy top or mild downtrend: vol-target
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
