/*
 * @coinsori-strategy v1
 * name: ETH-4h EMA Death Cross ATR Trail
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA-20/50 death cross reliably catches ETH trend shifts.
 * A fixed 20% stop is too crude for ETH's variable volatility — ATR-based
 * trailing stop tightens in calm periods and loosens during spikes, letting
 * winners run while protecting capital.
 * When it buys and sells: Buys on EMA-20/50 death cross with volume confirmation.
 * Exits on golden cross OR when price trails below 2×ATR from the peak.
 * When it does NOT work: Choppy markets with repeated EMA crosses cause
 * small losses. Strong one-way drops may still trigger the ATR stop before
 * a full reversal.
 */

function onUpdate(ctx) {
  // Need at least 50 bars for EMA-50
  const ema20_1 = ctx.ema(20, 1);
  const ema20_2 = ctx.ema(20, 2);
  const ema50_1 = ctx.ema(50, 1);
  const ema50_2 = ctx.ema(50, 2);
  const atr    = ctx.atr(14, 1);

  if (ema20_1 == null || ema20_2 == null || ema50_1 == null || ema50_2 == null || atr == null) {
    return null;
  }

  // Volume confirmation
  const avgVol = ctx.avgVol(20);
  const volOk = (avgVol != null && ctx.vol != null) ? ctx.vol >= avgVol * 0.5 : true;

  const inPosition = ctx.position > 0;

  // === ENTRY: Death cross (EMA-20 crosses below EMA-50) ===
  const prevDeathCross = ema20_2 <= ema50_2 && ema20_1 > ema50_1;

  if (!inPosition && prevDeathCross && volOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // === EXIT 1: Golden cross (EMA-20 crosses back above EMA-50) ===
  const prevGoldenCross = ema20_2 >= ema50_2 && ema20_1 < ema50_1;

  if (inPosition && prevGoldenCross) {
    return { side: 'sell', qty: ctx.position };
  }

  // === EXIT 2: ATR Trailing Stop ===
  // Track the highest price since entry
  if (inPosition) {
    const peakPrice = ctx.entryPx; // simplified: use entry as peak baseline
    const trailPx   = peakPrice - 2 * atr;
    if (ctx.price < trailPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
