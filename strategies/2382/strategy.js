/*
 * @coinsori-strategy v1
 * name: BTC Macro-Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto is highly sensitive to monetary policy. When the Fed is
 * cutting rates or holding them low (loose money), risk assets like BTC tend to rally;
 * when the Fed is hiking (tight money), liquidity drains and BTC tends to fall. This
 * uses the fed funds rate as a macro regime gate on top of a simple price trend — a
 * different data source than price indicators.
 * When it buys and sells: Buy when price is above its 50-day average AND the fed funds
 * rate is not in a sharp tightening cycle (rate below a high threshold). Sell when price
 * closes below the 50-day average.
 * When it does NOT work: Fed policy is slow-moving and monthly, so it cannot time the
 * short, sharp crypto cycles within a rate regime; and a rate gate can keep you out of
 * a bull market that runs despite high rates.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || px <= 0) return null;

  // Macro regime: fed funds rate. Above 4% counts as tight money (headwind for risk);
  // below that, policy is not a blocker. If the data is missing, fall back to price-only.
  const fed = ctx.data('fed');
  let tight = false;
  if (fed != null) {
    tight = fed > 4.0; // 4%+ rates = restrictive regime
  }

  if (pos === 0) {
    // Buy only when price trend is up AND money policy is not restrictive.
    if (px > sma50 && !tight && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit when the trend breaks. (Do not exit on tight alone — rate cycles are slow and
  // we don't want to whipsaw out of a bull just because rates crossed a line.)
  if (px < sma50) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
