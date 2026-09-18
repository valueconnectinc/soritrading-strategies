/*
 * @coinsori-strategy v1
 * name: BB Volatility Breakout + ATR Regime
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volatility expansion (Bollinger Band squeeze breakout) captures
 * explosive directional moves that RSI mean-reversion misses — when volatility surges,
 * price often trends strongly in one direction. ATR regime filter avoids fakeouts in
 * low-volatility chop. This is a TREND-FOLLOWING approach, opposite to the RSI
 * mean-reversion strategies tested earlier (1092, 1103).
 * When it buys and sells: Buy when price closes above upper Bollinger Band AND ATR
 * is rising (volatility expanding) AND EMA20 is above EMA50 (confirmed uptrend).
 * Sell when price closes below EMA20 OR ATR starts falling (volatility contracting).
 * When it does NOT work: In low-volatility chop where BB bands are narrow and
 * price oscillates around them. Also fails in slow grinding trends where volatility
 * never "expands" — the entry signal never fires.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  const ema20 = ctx.ema(20);
  const ema50 = ctx.ema(50);
  const atr = ctx.atr(14);

  if (bb == null || ema20 == null || ema50 == null || atr == null) return null;

  const upper = bb.upper;
  const mid = bb.mid;
  const price = ctx.price;
  const pos = ctx.position;

  // ATR momentum: compare current ATR to ATR 3 bars ago
  // Rising ATR = volatility expanding (good for breakout trades)
  const atr3 = ctx.atr(14, 3);
  const atrRising = atr3 != null && atr > atr3;

  // EMA trend: 20 > 50 = confirmed uptrend
  const bullTrend = ema20 > ema50;

  // BB width as volatility proxy (optional filter)
  const bbWidth = upper - bb.lower;
  const bbWidth2 = ctx.bb(20, 2, 2);
  const bbWidening = bbWidth2 != null && bbWidth > bbWidth2;

  // Price close above upper band = breakout confirmation
  const closes_1 = ctx.closes[1];
  const closes_2 = ctx.closes[2];
  const prevAboveUpper = closes_1 != null && closes_1 > ctx.bb(20, 2, 1)?.upper;
  const nowAboveUpper = price > upper;

  // Two-bar confirmation: prev bar closed above upper, this bar confirms
  const breakoutConfirmed = prevAboveUpper && nowAboveUpper;

  // ── ENTRY: BB breakout with volatility expansion ──────────────────
  if (pos === 0 && breakoutConfirmed && atrRising && bullTrend) {
    const stopPx = price - 2.5 * atr; // 2.5× ATR stop
    ctx.log(`BUY  BB_Breakout  price=${price}  upper=${upper.toFixed(1)}  ATR=${atr.toFixed(1)}`);
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.98,
      type: 'limit',
      price: price,
      trigger: { side: 'sell', type: 'stop', price: stopPx }
    };
  }

  // ── EXIT CONDITIONS ───────────────────────────────────────────────
  if (pos > 0) {
    // Exit 1: Price crossed below EMA20 (trend reversal)
    const ema20_1 = ctx.ema(20, 1);
    const crossBelowEma20 = closes_1 != null && ema20_1 != null &&
      closes_1 > ema20_1 && price <= ema20;

    if (crossBelowEma20) {
      ctx.log(`SELL EMA20_cross  price=${price}  ema20=${ema20.toFixed(1)}`);
      return { side: 'sell', qty: pos };
    }

    // Exit 2: ATR starts falling (volatility contracting = momentum fading)
    if (!atrRising) {
      ctx.log(`SELL ATR_falling  price=${price}  ATR=${atr.toFixed(1)}`);
      return { side: 'sell', qty: pos };
    }

    // Exit 3: Max hold 20 bars (80h at 4h) — prevent endless holds
    const entryBar = ctx.data('bbEntryBar');
    if (entryBar == null) {
      ctx.data.bbEntryBar = ctx.i;
      return null;
    }
    if (ctx.i - entryBar >= 20) {
      ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
