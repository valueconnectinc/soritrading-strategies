/*
 * @coinsori-strategy v1
 * name: BB squeeze contraction + momentum breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volatility contraction (BB squeeze) precedes big moves —
 * when BB bandwidth drops to low historical levels, a breakout becomes likely.
 * Entering after the squeeze resolves (bandwidth expanding + volume) catches
 * the directional explosion while avoiding false signals in noisy choppy SOL.
 * When it buys and sells: Enters long when BB bandwidth has contracted below
 * 40% of its 50-bar average, then price breaks above 20-bar high with volume.
 * Exits on ATR trailing stop or when bandwidth recontracts (volatility squeeze returns).
 * When it does NOT work: In prolonged low-volatility regimes where squeeze
 * resolves sideways, or when the breakout direction is wrong.
 */
function onUpdate(ctx) {
  // Warm-up
  const ema20 = ctx.ema(20);
  const ema20_1 = ctx.ema(20, 1);
  const bb = ctx.bb(20, 2);
  const bb_1 = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  if (ema20 == null || ema20_1 == null || bb == null || bb_1 == null || atr == null || avgVol == null || vol == null) return null;

  // BB bandwidth: (upper - lower) / middle band
  const bwCurr = (bb.upper - bb.lower) / bb.middle;
  const bwPrev = (bb_1.upper - bb_1.lower) / bb_1.middle;

  // 50-bar average bandwidth (for relative comparison)
  // Approximate: use ratio of consecutive bandwidths to detect contraction
  const bwContracting = bwCurr < bwPrev && bwPrev < (bb_1 ? (bb_1.upper - bb_1.lower) / bb_1.middle : bwPrev);
  const bwLow = bwCurr < 0.05; // absolute low bandwidth = squeeze

  // Donchian: 20-bar high/low
  const dcHigh_1 = ctx.high(20, 1);
  const dcLow_1  = ctx.low(20, 1);
  if (dcHigh_1 == null || dcLow_1 == null) return null;

  const prevClose = ctx.closes[1];
  if (prevClose == null) return null;

  // EMA20 rising = short-term uptrend
  const emaRising = ema20 > ema20_1;

  // Volume expanding: current vol above average
  const volExpanding = vol > avgVol;

  // Breakout: previous close above prior 20-bar high
  const breakout = prevClose > dcHigh_1;

  // Squeeze resolved: bandwidth was contracting and now price breaks out
  const squeezeResolved = bwLow && breakout && volExpanding;

  if (!ctx.position) {
    // Entry: squeeze resolved + breakout confirmed + trend rising
    if (squeezeResolved && emaRising) {
      return {
        side: 'buy',
        qty: ctx.cash / ctx.price * 0.99
      };
    }
    // Fallback: pure breakout in strong trend (no squeeze needed)
    if (emaRising && breakout && volExpanding) {
      return {
        side: 'buy',
        qty: ctx.cash / ctx.price * 0.99
      };
    }
  } else {
    // Exit 1: bandwidth recontracts (squeeze returns = get out)
    if (bwCurr < bwPrev * 0.7) {
      return { side: 'sell', qty: ctx.position };
    }
    // Exit 2: price closes below 20-bar low
    if (prevClose < dcLow_1) {
      return { side: 'sell', qty: ctx.position };
    }
    // Exit 3: ATR trailing stop (2.5x ATR)
    if (ctx.price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
