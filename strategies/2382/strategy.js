/*
 * @coinsori-strategy v1
 * name: BTC Macro-Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto is highly sensitive to monetary policy. The DIRECTION of the
 * fed funds rate matters more than its level: when the Fed is easing (cutting rates)
 * liquidity is expanding and risk assets rally; when it is tightening (hiking) liquidity
 * drains. This uses the rate's direction as a macro regime gate on top of a price trend —
 * a different data source than price indicators.
 * When it buys and sells: Buy when price is above its 50-day average AND the fed funds
 * rate is not currently in a sharp tightening cycle (rate not at a multi-month high).
 * Sell when price closes below the 50-day average.
 * When it does NOT work: Fed policy is slow-moving and monthly, so it cannot time the
 * short, sharp crypto cycles within a rate regime; and any policy gate can keep you out
 * of a bull market that runs despite the macro backdrop.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || px <= 0) return null;

  // Macro regime by DIRECTION: compare the current fed funds rate to its level roughly
  // half a year ago (180 days back). If the rate is meaningfully higher now, the Fed is
  // tightening (headwind); if flat or lower, policy is not a blocker.
  const fed = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30'); // fed funds lagged 30 rows (~monthly)
  let tight = false;
  if (fed != null && fedLag != null && fedLag > 0) {
    // Tightening = rate more than 0.5pp above where it was ~6 months ago.
    tight = fed - fedLag > 0.5;
  }

  if (pos === 0) {
    if (px > sma50 && !tight && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  if (px < sma50) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
