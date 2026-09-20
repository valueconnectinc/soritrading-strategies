/*
 * @coinsori-strategy v1
 * name: SOL Vol-Adaptive Exit Trend Ride 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SOL SMA200+0.3x ATR trend-ride champion is validated
 * (+830%/+140%/+49% across 3 windows) but carries high drawdown (43-59%) because
 * SOL drops hard inside its volatile bulls. Prior exit-modifications (faster SMA,
 * trailing stop, fear-greed exit) all failed because they cut bulls short. This
 * variant only exits early when volatility is genuinely high — a faster SMA50 exit
 * when ATR is in an elevated regime, the slow SMA200 otherwise — so calm bulls ride
 * untouched but violent regimes are trimmed.
 * When it buys and sells: buy on a close crossing above SMA200+0.3x ATR; sell on a
 * close crossing below the exit line, which is SMA50 when ATR is elevated (ATR% of
 * price above 5%) else SMA200-0.3x ATR.
 * When it does NOT work: if SOL's drawdowns are not actually ATR-elevated (crashes on
 * calm readings), the adaptive exit never engages and it behaves like the champion;
 * and the faster exit still risks cutting a bull short in a noisy high-vol period.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  const band = atr != null ? 0.3 * atr : 0;

  if (pos <= 0) {
    if (closePrev2 <= smaP + band && closePrev > sma + band) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const risk = 0.02 * cash;
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // Volatility-adaptive exit: faster SMA50 only when ATR is elevated.
    // ATR% = 14-ATR as a fraction of price; >5% flags a violent regime (SOL 4h ATR is
    // normally 2-4%). This is the judgement that lets calm bulls ride untouched.
    const atrPct = atr != null && price > 0 ? atr / price : 0;
    const highVol = atrPct > 0.05;
    const exitSma = highVol ? ctx.sma(50, 1) : sma;
    if (exitSma == null) return null;
    if (closePrev < exitSma - band) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
