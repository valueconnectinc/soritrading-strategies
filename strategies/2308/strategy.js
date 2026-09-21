/*
 * @coinsori-strategy v1
 * name: BTC Macro On-Chain Regime Defense
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin behaves very differently in Fed easing vs
 * tightening regimes. When the Fed is cutting rates, liquidity expands and
 * BTC trends up; when it is hiking, liquidity drains and BTC tends to fall.
 * We combine that slow macro regime with Bitcoin's own on-chain health
 * (mining hashrate expanding = network strong) to only hold in the most
 * favorable conditions, and use a wide ATR-based trailing stop so we ride
 * bull runs without being shaken out by normal pullbacks.
 * When it buys: the fed funds rate is NOT rising (flat or falling) AND
 * price is above its 200-day average AND hashrate is above its 30-day
 * average. When it sells: the fed funds rate starts rising (tightening)
 * OR price falls more than 3x the ATR from its recent peak (wide trailing
 * stop that ignores small noise but catches real reversals).
 * When it does NOT work: this is a defensive strategy — it will never beat
 * buy-and-hold in a raging bull market because it sits in cash during Fed
 * tightening even if BTC is pumping. It also lags at the very start of a
 * bull run because all three conditions must confirm first. In a long flat
 * Fed regime with choppy BTC, the 200-day gate still whipsaws.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  // Macro regime from the fed funds rate. It changes rarely, so compare the
  // current rate to its value ~30 bars back to detect easing vs tightening.
  const fed = ctx.data('fed');
  const fedPrev = ctx.data('macro_fed_funds');
  if (fed == null || fedPrev == null) return null;

  // On-chain health: hashrate expanding means the network (and usually the
  // trend) is strengthening.
  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  if (hr == null || hrAvg == null || hrAvg === 0) return null;

  const pos = ctx.position || 0;
  const uptrend = px > sma200;
  const hashrateOk = hr >= hrAvg;

  // Easing/neutral = fed not rising. We treat a rising fed funds rate as a
  // "tightening" regime and sit out. This single macro gate is the core of
  // the defensive thesis.
  const easing = fed <= fedPrev;

  if (pos === 0) {
    // ENTRY: all three conditions — macro neutral/easing, uptrend, hashrate ok.
    if (easing && uptrend && hashrateOk) {
      ctx.state.peak = px;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // Track the highest price since entry (trailing peak).
  const peak = Math.max(ctx.state.peak || px, px);
  ctx.state.peak = peak;

  // EXIT 1: Fed starts tightening — liquidity regime turns against us.
  if (!easing) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  // EXIT 2: wide ATR trailing stop. 3x ATR from the peak is far enough to
  // ignore normal pullbacks but catches a real trend break. This is the
  // anti-whipsaw fix.
  if (px < peak - 3 * atr) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
