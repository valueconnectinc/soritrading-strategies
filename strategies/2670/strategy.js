/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion DOT 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated cross-asset champion recipe (band-bounce
 * mean reversion) applied to a fresh large-cap, DOT, not yet in the 13-asset
 * validated set. DOT overreacts to the downside, touches the lower Bollinger
 * band, then snaps back to the mean. This is the family proven to generalize
 * across assets (unlike VWAP-pullback and squeeze-breakout, which are
 * asset-specific).
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30, above the 200-SMA. Sells at the middle band, RSI>50, or a 6-ATR
 * stop; 5-bar re-entry cooldown.
 * When it does NOT work: lags strong melt-ups (never buys without a dip).
 * A panic that keeps falling still loses despite the stop. Never buys below
 * the 200-SMA, so it sits out bear markets (its main protection).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
