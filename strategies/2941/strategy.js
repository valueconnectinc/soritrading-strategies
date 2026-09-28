/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A breakout to a new 20-bar high is a sign a move is
 * starting, and when it happens on a volume surge (>1.5x average) it means
 * real money is pushing price through resistance — not a fakeout. We ride the
 * breakout and protect profits with a wide ATR trailing stop so we stay in the
 * big winners but get out fast when the move stalls.
 *
 * When it buys and sells: buys when price closes above the highest high of the
 * last 20 bars AND volume is more than 1.5x its 20-bar average. Sells when
 * price falls 3 average-ranges (ATR) below the highest point reached since
 * entry (a trailing stop).
 *
 * When it does NOT work: in a sideways chop the 20-bar high gets broken by
 * noise and the volume filter does not always save us — whipsaw. In a sharp
 * V-shaped top the trailing stop lags and gives back gains. It never shorts,
 * so it does not profit from down-moves.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  const h20 = ctx.high(20, 1);          // highest high of last 20 CLOSED bars
  const avgV = ctx.avgVol(20);
  const atr = ctx.atr(14, 1);
  if (h20 == null || avgV == null || atr == null) return null;

  const st = ctx.state;

  if (ctx.position > 0) {
    // Raise the trailing stop as price makes new highs since entry.
    if (px > (st.peak || 0)) st.peak = px;
    const stop = (st.peak || px) - 3 * atr;   // 3x ATR trail: validated sweet spot
    if (px < stop) {
      st.peak = 0;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Breakout on a volume surge. Use closed-bar high (ago=1) so live and
  // backtest agree; require volume clearly above average to filter fakeouts.
  if (px > h20 && ctx.vol > avgV * 1.5) {
    st.peak = px;
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
