/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Target AllRegimes 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: improvement on the validated SOL trend-gated vol-target
 * champion (2209). The champion's 2020-22 window had a 70% drawdown because it
 * held 100% during high-volatility bull runs. This version applies the ATR
 * vol-target position cap in ALL regimes, so it holds less when volatility is
 * extreme — trading some upside for a much lower drawdown.
 * When it buys and sells: above SMA50 = vol-targeted long (capped by ATR). Below
 * SMA50 but within ATR-scaled band = smaller vol-target. Beyond the ATR crash band
 * = fully to cash.
 * When it does NOT work: vol-targeting trims winners in sustained low-vol bull
 * runs, so it underperforms a plain hold when SOL trends calmly upward. Deep
 * drawdowns still occur in violent crashes, just smaller than the 100% version.
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
  // ATR-scaled crash band: 3.0 ATRs below the SMA50. Same as champion — normal SOL
  // dips stay in the vol-target regime, only a genuine crash triggers full exit.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  // Vol-target cap: hold 2% daily vol worth of position in ALL regimes. In
  // uptrend this trims the position when ATR is high (cutting bull-run drawdown);
  // in mild downtrend it scales down further. 2% target chosen to match the
  // champion's mild-downtrend sizing so the two regimes stay consistent.
  const targetValue = (0.02 * equity) / (atr / price);
  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = Math.min(equity / price, targetValue / price); // uptrend: vol-capped
  } else {
    targetQty = targetValue / price; // mild downtrend: same vol-target
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
