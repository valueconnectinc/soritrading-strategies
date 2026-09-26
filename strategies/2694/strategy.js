/*
 * @coinsori-strategy v1
 * name: Band-Bounce Fear-Greed Gated DOT 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion band-bounce mean-reversion recipe,
 * now gated by a Fear-Greed sentiment filter. Tests whether adding an on-chain
 * sentiment regime (buy only when the market is fearful) makes the proven
 * defensive entries more selective and cuts weak bounces.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30, price above the 200-SMA, AND the Fear-Greed index is below 40
 * (fearful). Exits at the middle band / RSI>50 or a 6-ATR stop; waits 5 bars.
 * When it does NOT work: in prolonged euphoric melt-ups it never buys (stays in
 * cash and lags hold); a sentiment reading that lags the daily close can miss a
 * fast panic. Defensive, not a trend rider.
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

  // Fear-Greed gate: only buy when sentiment is fearful (<40).
  // Rationale: band-bounces are most reliable after panic; in euphoria the
  // mean-reversion edge is weaker and bounces are less trustworthy.
  const fg = ctx.data('fear_greed');
  if (fg == null || fg >= 40) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
