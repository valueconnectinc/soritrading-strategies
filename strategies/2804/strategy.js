/*
 * @coinsori-strategy v1
 * name: ETH 4H Band-Bounce Champion (control, no gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Control version of the band-bounce mean-reversion champion
 * with NO fed-funds gate, so we can measure whether adding the monetary-policy
 * gate to the champion actually reduces drawdown or just removes good trades.
 * When it buys and sells: buys a panic dip (price below the lower Bollinger band,
 * RSI<30, price above the 200-SMA) and sells at the mid-band, on RSI>50, or on a
 * 6-ATR stop. No macro gate.
 * When it does NOT work: buys dips that keep falling in strong macro downtrends
 * (the champion's known weakness the fed gate is meant to fix).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const pos = ctx.position;

  if (pos > 0) {
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    const atr = ctx.atr(14, 1);
    if (bb == null || rsi == null || atr == null) return null;
    const mid = bb.mid;
    const entry = ctx.entryPx;
    if (price >= mid || rsi > 50 || (entry != null && price <= entry - 6 * atr)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;
  if (price <= sma200) return null;
  if (price > bb.lower) return null;
  if (rsi >= 30) return null;

  const lastTrade = ctx.state.lastTradeBar != null ? ctx.state.lastTradeBar : -1e9;
  if (ctx.i - lastTrade < 5) return null;
  ctx.state.lastTradeBar = ctx.i;

  return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
}
