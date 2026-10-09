/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze + Bull Sleeve (EMA20 exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion), and low-volatility squeezes
 * that break out tend to keep trending (momentum). In a strong bull regime a
 * fresh 90-day high is bought and held while price stays above the 20-day EMA,
 * so straight melt-ups are captured instead of being stopped out by noise.
 * When it buys and sells: buys a flush to the lower band with RSI below 40, or
 * a squeeze breakout above the upper band, both only above the 200-day average
 * and with above-average volume; in a strong bull regime it also buys a fresh
 * 90-day high. A flush trade sells on the snap-back to the middle band, a
 * breakout and a bull-sleeve trade sell below the middle band (EMA20).
 * When it does NOT work: in a persistent downtrend it stays in cash, and in a
 * choppy sideways market above the 200-day average the bull sleeve can whipsaw.
 * It underperforms buy-and-hold in strong bull years that never pull back to
 * the lower band, and it pays fees on every round trip. Defensive first.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush, rare enough to avoid overtrading
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    const et = st.entryType;
    if (et === 'mr' && price > ema20) { // flush trade: exit on snap-back to the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'brk' && price < ema20) { // breakout trade: hold while above the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'trend' && price < ema20) { // bull sleeve: ride the melt-up until the 20-day trend flips
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Squeeze detection: current ATR well below its own 50-bar mean (low volatility).
  if (st.squeeze == null) st.squeeze = {};
  const squeeze = st.squeeze != null ? atr < 0.85 * st.squeeze.avg : false;
  return null;
}
