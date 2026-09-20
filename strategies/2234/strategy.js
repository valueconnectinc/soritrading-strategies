/*
 * @coinsori-strategy v1
 * name: ETH Dual-Oscillator Mean Reversion 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ledger shows plain BB+RSI mean-reversion FAILS on ETH
 * (its oversold dips are genuine breakdowns, not bounces). But a dual-oscillator
 * version — requiring BOTH RSI<35 AND Stochastic %K<25 — plus an EMA200 uptrend
 * filter is the strongest validated ETH approach (+43/+33/+20% across 3 windows,
 * MDD ~4%, beating the market by 63pp in the recent bear). Requiring two
 * independent oversold signals filters out false breakdowns that a single
 * oscillator catches, and the EMA200 filter keeps us out of a downtrend.
 * When it buys and sells: buy when RSI<35 AND Stochastic %K<25 AND price is
 * above the 200-bar EMA (only mean-revert inside an uptrend). Sell when RSI
 * recovers above 65 or price falls below the EMA200.
 * When it does NOT work: in a strong sustained bull the oscillators rarely go
 * oversold so it sits in cash and misses the melt-up; a genuine multi-week
 * downtrend that has not yet broken EMA200 can still catch a knife.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const st = ctx.stoch(14, 3, 1);
  const ema200 = ctx.ema(200, 1);
  if (rsi == null || st == null || st.k == null || ema200 == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // dual oversold + uptrend filter
    if (rsi < 35 && st.k < 25 && price > ema200) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on RSI recovery or trend break
    if (rsi > 65 || price < ema200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
