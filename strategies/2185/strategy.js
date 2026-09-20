/*
 * @coinsori-strategy v1
 * name: BTC Hashrate ATR-Vol-Targeted 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' computing power) is an
 * on-chain fundamental that leads price over long stretches, but it lags in
 * a crash, so a 100-day price-trend guard protects the bear. This version
 * adds ATR volatility-targeted sizing: it sizes each position so the dollar
 * risk per trade is roughly constant, entering smaller in choppy/high-vol
 * conditions and larger in calm ones. This is the same risk-management idea
 * that improved the ETH trend-ride and is untested on BTC hashrate.
 * When it buys and sells: buy when smoothed hash rate is above its 60-day-ago
 * level AND price is above its 100-day average. Sell when hash rate turns
 * down or price closes below the 100-day average. Position size is set
 * inversely to the 14-day ATR so a big move risks about the same dollars each
 * trade.
 * When it does NOT work: in a raging bull the ATR is high so it sizes down
 * and captures less upside than fixed sizing; it never beats buy-and-hold in
 * a straight bull; halving events distort the hash-rate trend.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const sma = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || sma == null || atr == null || closePrev == null) return null;

  const hist = ctx.state.hist || [];
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  let beenIn = ctx.state.beenIn || false;

  if (pos <= 0) {
    if (prev60 == null) return null;
    const hrRising = hr > prev60 * 1.02;
    const hrMild = hr > prev60 * 1.005;
    const aboveSma = closePrev > sma;
    if (aboveSma && ((beenIn && hrMild) || (!beenIn && hrRising))) {
      // vol-target: risk a fixed cash amount per trade; smaller when ATR is large
      // targetRisk = 6% of cash; fraction = targetRisk / (atr/price)
      const frac = Math.min(0.95, (0.06 * cash) / (atr * 0.6));
      const qty = (cash / price) * Math.max(0.05, frac);
      ctx.state.beenIn = true;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if ((prev60 != null && hr < prev60 * 0.98) || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
