/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset DXY-Gated
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 5-asset defensive MR basket is the validated champion
 * (3052), but its documented weakness is catching a falling knife in a broad
 * coordinated crash (MDD 12-13%). This version adds a macro risk-off gate: when
 * the dollar index (DXY) is spiking hard, the whole basket stands aside, because
 * crypto mean-reversion pullbacks during a dollar-strength risk-off tend to keep
 * falling instead of recovering. It keeps the champion's per-leg recipe unchanged.
 * When it buys and sells: On each asset, buy when price closes below the lower
 * Bollinger (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low with
 * RSI<40, only inside a rising 200-day average AND only when DXY is not spiking.
 * Sell via an ATR-trailing stop (2.5 ATR below the highest close since entry) or
 * when price closes back above the 20-day EMA.
 * When it does NOT work: In a risk-on dollar regime the gate never triggers and
 * the basket behaves exactly like the champion. If DXY spikes but crypto still
 * recovers quickly, the gate costs a few missed pullbacks. In a slow grind (no
 * sharp DXY spike) it does not protect against a gradual crypto bear.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  // Macro risk-off gate: stand aside when DXY is spiking hard (global risk-off).
  // A sharp 3-day dollar surge is a broad de-risking signal; MR pullbacks during it
  // are falling knives, not recoveries. Threshold: 3-day DXY change > 1.5%.
  let dxy = null;
  try {
    const s = ctx.macro('dxy');
    if (s && Array.isArray(s) && s.length >= 4) {
      const now = s[s.length - 1];
      const past = s[s.length - 4];
      if (Number.isFinite(now) && Number.isFinite(past) && past > 0) {
        dxy = (now - past) / past;
      }
    }
  } catch (e) { dxy = null; }
  const riskOff = dxy != null && dxy > 0.015;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    // If already in, the trail/EMA exits still apply regardless of the gate.
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 2.5 * atr;
    if (price < trailStop || price > ema20) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend || riskOff) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
