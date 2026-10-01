/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze-Breakout (upbit)
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: Two complementary entries inside one rising trend gate.
 * Mean-reversion buys pullbacks to the lower Keltner band, but only while price
 * stays above the 60-day average (a pullback in a healthy uptrend, not a falling
 * knife). Bollinger-squeeze breakout buys a fresh 20-day high when volatility has
 * compressed, capturing the expansion leg of the bull. Sizing is full when the
 * trend is strong so the melt-up is captured, and ATR-scaled (smaller) in a weak
 * trend so bear entries are conservative.
 * When it buys and sells: Buy either (a) a pullback to the Keltner lower band
 * (EMA20 - 2.5*ATR) with RSI<40 while price stays above the 60-day average, or
 * (b) a close above the 20-day high when Bollinger width is in the quietest 20%
 * of the last 40 bars while the 60-day average is rising. Sell when price closes
 * back below the 20-day EMA (trend has turned).
 * When it does NOT work: It lags a straight-line melt-up because the breakout
 * waits for a compression first, and in a persistent bear the rising trend gate
 * keeps it flat. It is long-only, not a crash trader.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma60 = ctx.sma(60, 1);
  const sma60prev = ctx.sma(60, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  if (sma60 == null || sma60prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma60 > sma60prev;
  // "Strong" trend = price comfortably above the 60-day average (bull melt-up).
  const strongTrend = price > sma60 * 1.02;

  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    if (price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Entry A: pullback to Keltner low, only while price holds above the 60-day avg.
  let mrEntry = false;
  if (rsi != null && rsi < 40 && price < keltnerLow && price > sma60) mrEntry = true;

  // Entry B: Bollinger-squeeze breakout (bull expansion).
  let squeezeEntry = false;
  if (bb != null) {
    const widthNow = bb.upper - bb.lower;
    const widths = [];
    for (let k = 1; k <= 40; k++) {
      const b = ctx.bb(20, 2, k);
      if (b == null) continue;
      widths.push(b.upper - b.lower);
    }
    if (widths.length >= 30) {
      const sorted = widths.slice().sort((a, b) => a - b);
      const quietThresh = sorted[Math.floor(sorted.length * 0.2)];
      const squeezed = widthNow <= quietThresh;
      const high20 = ctx.high(20, 1);
      if (squeezed && high20 != null && price > high20) squeezeEntry = true;
    }
  }

  if (mrEntry || squeezeEntry) {
    let qty;
    if (strongTrend) {
      // Strong trend: ride the melt-up at near-full size.
      qty = (ctx.cash / price) * 0.95;
    } else {
      // Weak trend: ATR-scaled, risk ~2.5% of equity per trade.
      const riskBudget = 0.025 * (ctx.cash + pos * price);
      qty = riskBudget / atr;
    }
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
