/*
 * @coinsori-strategy v1
 * name: Uptrend Pullback Reversion (BTC 1D)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: in a confirmed long-term uptrend, sharp short-term dips
 * (RSI oversold) tend to mean-revert — buyers step in at support. This is the
 * opposite family to the momentum champion: it buys weakness, not strength.
 * When it buys and sells: buys only when price is above the 200-day average AND
 * the 14-day RSI is oversold (<35) — a dip inside a bull market. Sells when RSI
 * recovers above 55 (the dip has reverted) or price breaks below the 200-day
 * average (the bull regime is over).
 * When it does NOT work: in a prolonged bear market it stays out (good), but in
 * a slow grinding bear it can whipsaw near the 200-day line, and in a strong
 * bull it trades rarely because RSI rarely gets oversold. It also loses money
 * on coins whose "dips" keep dipping (no support).
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const closes = ctx.closes;
  if (closes.length < 2) return null;
  const prevClose = closes[closes.length - 2];

  const pos = ctx.position;

  // Exit: the dip has reverted (RSI > 55) or the bull regime broke (below 200-day).
  if (pos > 0 && (rsi > 55 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  // Entry: oversold dip inside a confirmed uptrend. RSI<35 = short-term panic,
  // price>SMA200 = long-term buyers still in control.
  if (pos === 0 && rsi < 35 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
