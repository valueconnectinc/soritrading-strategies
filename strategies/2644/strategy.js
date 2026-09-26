/*
 * @coinsori-strategy v1
 * name: FearGreed-Gated Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC trends strongly, so a turtle-style 55-day-high breakout
 * rides those trends — but it whipsaws on false breakouts in chop. This adds a
 * sentiment gate: it skips breakouts when the market is at extreme greed (a
 * blow-off top that usually reverses) or extreme fear (downtrend not yet
 * broken). Fear-greed is the one external data axis that actually works here.
 * When it buys and sells: buys on a 55-day-high close above the 200-day average
 * only when fear-greed is between 10 and 80; sells when the close falls below
 * the 20-day low. Position risk-sized to 3%.
 * When it does NOT work: if fear-greed is missing the gate does nothing and it
 * behaves like plain Donchian; it still lags sharp reversals and can give back
 * money in prolonged chop where sentiment stays mid-range while price chops.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const hi55 = ctx.high(55, 1);
  const lo20 = ctx.low(20, 1);
  const sma200 = ctx.sma(200, 1);
  if (hi55 == null || lo20 == null || sma200 == null) return null;

  const fg = ctx.data('fear_greed'); // 0-100 fear-greed index
  const pos = ctx.position;

  if (pos > 0) {
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  // Sentiment gate: skip the breakout at extreme greed (blow-off top) or
  // deep fear (downtrend not confirmed broken). Fail-open if data missing.
  const fgOk = (fg == null) ? true : (fg > 10 && fg < 80);

  if (px > hi55 && px > sma200 && fgOk) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    const riskPerCoin = atr * 2;
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.03) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
