/*
 * @coinsori-strategy v1
 * name: Long-Horizon Momentum 60d ROC BTC/ETH 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sensitivity check on the momentum horizon. The 90-day
 * version was positive 5/5 windows cross-asset but lagged recent melt-up
 * recoveries (too slow to re-enter after the 2022 crash). A 60-day ROC is
 * tested here to see if it catches recoveries faster without adding whipsaw.
 * When it buys and sells: buys when the 60-day return is strongly positive
 * (+8%) AND price is above the 200-day average; sells when the 60-day return
 * turns clearly negative (-8%) or price falls below the 200-day average, with
 * a cooldown after each exit.
 * When it does NOT work: a shorter horizon is noisier and may whipsaw in chop
 * that the 90-day filter would have ignored.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null || atr <= 0) return null;

  const closes = ctx.closes;
  if (!closes || closes.length < 62) return null;

  // 60-day time-series momentum.
  const now = closes[closes.length - 1];
  const past = closes[closes.length - 1 - 60];
  if (!Number.isFinite(now) || !Number.isFinite(past) || past <= 0) return null;
  const roc = (now - past) / past;

  const ENTER = 0.08;
  const EXIT = -0.08;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  const riskEq = 0.015 * ctx.cash;
  const qty = riskEq / atr;
  const maxQty = ctx.cash / price * 0.95;

  if (pos > 0) {
    if (roc < EXIT || price < sma200) {
      ctx.state.cd = 15;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (cd > 0) return null;

  if (roc > ENTER && price > sma200) {
    ctx.state.cd = 15;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
