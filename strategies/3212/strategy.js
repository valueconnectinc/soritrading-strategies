/*
 * @coinsori-strategy v1
 * name: 1D Multi-Asset Momentum Volume-Confirmed
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the champion momentum core is validated, but it enters
 * on price alone — some breakouts are fake (low participation) and get
 * chopped. This version only enters when volume confirms the move (daily
 * volume above 1.3x the 20-day average), so entries happen on real
 * participation. Tested at 1D where prior volume tests were on 4H only.
 * When it buys and sells: buy BTC/ETH/SOL when 90d momentum > +20%, price
 * above the 200-day average, the Fed is not hiking, AND today's volume is at
 * least 1.3x the 20-day average volume. Sell when momentum fades below +5%
 * or price breaks the 200-day.
 * When it does NOT work: in a low-volume grind (steady rally on shrinking
 * volume) it never enters and misses the whole move; volume spikes also
 * happen at capitulation bottoms, which this trend strategy does not trade.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null) return null;

  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking && vol > avgVol * 1.3) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 };
  }
  return null;
}
