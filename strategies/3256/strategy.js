/*
 * @coinsori-strategy v1
 * name: btc_mean_reversion_1d
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC on daily candles tends to snap back toward its mean after sharp
 * overreactions, especially when a long-term trend is intact. I bet on short-term
 * oversold bounces rather than chasing momentum.
 * When it buys and sells: buys when RSI is deeply oversold and price has fallen far below
 * the 50-day average (a panic dip); sells when RSI climbs back to neutral or higher.
 * When it does NOT work: in a sustained bear market the "dip" keeps dipping and the bounce
 * never comes — this loses badly in prolonged downtrends without a trend filter.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  if (rsi == null || rsiPrev == null || sma50 == null || sma200 == null) return null;

  // Trend filter: only mean-revert when price is above the 200-day average.
  // Without this, a bear market turns every "bounce" into a losing catch.
  const inUptrend = px > sma200;

  if (ctx.position > 0) {
    // Exit: sell when RSI recovers to neutral (overbought relief) 
    if (rsi >= 50) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (!inUptrend) return null;

  // Buy deep oversold panic: RSI < 30 and price well below the 50-day mean.
  // RSI<30 = extreme fear; price below sma50 confirms the dip is overextended.
  const belowMean = px < sma50 * 0.97;
  if (rsi < 30 && rsiPrev >= rsi && belowMean) {
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
