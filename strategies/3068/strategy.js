/*
 * @coinsori-strategy v1
 * name: Multi-Asset Bear-MR Basket 5-Asset Soft-Filter
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The no-gate stop-protected MR basket captured far more upside than the
 * champion (bought V-bounces in bears the 200d gate skipped) but whipsawed in deep bears
 * (2022-24 MDD 16.7%). This version keeps the hard-stop protection AND adds a SOFT bear
 * filter: it only blocks buys in a genuine deep bear — price below the 200-day average AND
 * the 200-day still falling. Sideways (price above a flat 200d) and early-recovery (200d
 * turning up) regimes still allow MR buys, preserving most of the upside while cutting the
 * deep-bear whipsaw.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low (EMA20-2.5*ATR) with RSI<35,
 * and only while NOT in a deep bear (price below 200d AND 200d slope negative). Sell on a
 * hard stop 1.5 ATR below entry, when price closes back above the 20-day EMA, or when RSI
 * recovers above 55.
 * When it does NOT work: In a fast crash where the 200d slope lags (still positive while
 * price dives), it can still buy a falling knife. In sustained grinding bears it whipsaws.
 * It is a higher-risk/higher-return profile than the conservative gate champion.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 21); // 200d ~20 bars ago, for slope
  if (bb == null || rsi == null || ema20 == null || atr == null || atr <= 0 || sma200 == null || sma200prev == null) return null;

  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    const entry = ctx.state.entry != null ? ctx.state.entry : price;
    const hardStop = entry - 1.5 * atr;
    if (price < hardStop || price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Soft bear filter: block only a genuine deep bear (price below 200d AND 200d falling).
  const deepBear = price < sma200 && sma200 < sma200prev;
  if (deepBear) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 35;

  if (bollingerFlush || keltnerPullback) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    ctx.state.entry = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
