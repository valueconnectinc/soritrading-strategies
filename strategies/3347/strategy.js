/*
 * @coinsori-strategy v1
 * name: BTC Trend Pullback 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend, pullbacks to oversold are bought by dip-buyers and the trend resumes. Entering on the pullback (not chasing the breakout) gives better risk/reward than breakout entries.
 * When it buys and sells: Buys when the 50-day average is above the 200-day average (uptrend) and the 14-day RSI dips below 40 (pullback). Sells when RSI turns overbought (>70), price falls back under the 50-day average, or on an 8% stop.
 * When it does NOT work: In a choppy sideways market the trend filter is unreliable and pullbacks can keep extending — the stop and trend-break exit cap but cannot prevent losses. It is mostly in cash during bear markets.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);        // closed RSI(14)
  const ma50 = ctx.sma(50, 1);       // closed 50-day average
  const ma200 = ctx.sma(200, 1);     // closed 200-day average
  if (rsi == null || ma50 == null || ma200 == null) return null;
  const price = ctx.price;
  const st = ctx.state;

  if (ctx.position <= 0) {
    // Uptrend (50>200) + pullback (RSI<40) = buy the dip inside the trend
    if (ma50 > ma200 && rsi < 40) {
      st.entryBar = ctx.i;
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  const rsiNow = ctx.rsi(14, 0);
  // Exit on overbought (sell into strength), trend break below the 50-day, or an 8% hard stop
  if (rsiNow > 70 || price < ma50 || price <= entry * 0.92) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
