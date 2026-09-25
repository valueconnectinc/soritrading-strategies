/*
 * @coinsori-strategy v1
 * name: SOL 1H RSI Oversold Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The job's champion is a slow 4h regime hybrid. This is a
 * DIFFERENT family — fast oscillator mean reversion on 1h. It bets that when SOL
 * gets deeply oversold (RSI < 20) at the lower Bollinger band, a bounce is likely
 * within a few hours. It is a short-horizon, high-frequency reversion, opposite in
 * construction to the slow trend/regime champion.
 * When it buys and sells: Buy when RSI(14) < 20 AND price is at/below the lower
 * Bollinger(20,2) band. Sell when RSI climbs back above 45 (bounce played out) or
 * on a 2x ATR stop. Position is ATR vol-targeted so a 1-ATR adverse move costs
 * ~1.5% of equity.
 * When it does NOT work: In strong down-trends a deeply-oversold bounce can keep
 * falling (catching a knife). In dead quiet markets the bounce is too small to
 * cover fees. Fast 1h trading churns fees, so it needs a real bounce to win.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  if (rsi == null || bb == null || bb.lower == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // stop: 2x ATR below entry (a deeper fall means the knife kept dropping)
    if (price <= ctx.entryPx - atr * 2) return { side: 'sell', qty: pos };
    // exit when the bounce has played out (RSI back above 45)
    if (rsi > 45) return { side: 'sell', qty: pos };
    return null;
  }

  // ATR vol-targeted size (same lever that fixed the champion)
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  // deep oversold at the lower band = high-probability bounce setup
  if (rsi < 20 && price <= bb.lower) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
