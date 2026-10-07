/*
 * @coinsori-strategy v1
 * name: BTC Long-Horizon Momentum Hysteresis 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's big moves are long-horizon trends. A 90-day rate of
 * change tells whether the market has been moving up or down over a quarter,
 * filtering out the daily noise that whipsaws short-term signals. A hysteresis
 * band (enter only above +5%, exit only below -5%) stops the signal flipping on
 * small wiggles, and the 200-day average confirms the trend is intact. This is
 * the only family that held up in this job's tests.
 * When it buys and sells: Buys when the 90-day change is above +5% AND price is
 * above the 200-day average. Sells when the 90-day change falls below -5% OR
 * price drops below the 200-day average. A 10-bar cooldown prevents flip-flopping.
 * When it does NOT work: In a long flat/choppy range with no sustained move the
 * signal stays near zero and does nothing (opportunity cost), and in a slow
 * grinding bear market the 200-day gate keeps it mostly in cash but it still
 * suffers the -5% exit drawdown before leaving.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 200-day trend gate on the CLOSED bar (ago=1 -> identical live/backtest).
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // 90-day rate of change, computed on closed bars only.
  const closes = ctx.closes;
  if (!closes || closes.length < 92) return null;
  const cNow = closes[closes.length - 2];   // last CLOSED bar
  const c90 = closes[closes.length - 92];   // 90 bars before it
  if (!Number.isFinite(cNow) || !Number.isFinite(c90) || c90 <= 0) return null;
  const roc = (cNow - c90) / c90 * 100;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    // Exit: momentum died (roc < -5%) or the long-term trend broke.
    if (roc < -5 || price < sma200) {
      ctx.state.cd = 10;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter only after a real quarter-long advance, confirmed by the 200-day.
  if (roc > 5 && price > sma200 && cd === 0) {
    ctx.state.cd = 10;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
