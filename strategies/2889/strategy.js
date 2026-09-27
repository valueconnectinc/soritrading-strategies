/*
 * @coinsori-strategy v1
 * name: Hashrate-Gated Keltner MR BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC hashrate (miner compute) is a smooth, slow on-chain
 * regime signal: rising hashrate means miners are committing more hardware to
 * the network (bullish commitment), falling hashrate means miner capitulation
 * (bearish). Gating the validated Keltner mean-reversion buys on a hashrate
 * uptrend aims to avoid flush-buying during miner-capitulation regimes, where
 * flushes keep going. Uses the user's real hashrate data as a SLOW gate, never
 * as a per-bar trigger (the ledger showed per-bar on-chain triggers whipsaw).
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40, price above the 200-day average, AND hashrate above its
 * 30-day average. Sells on the snap-back to the middle band (EMA20). If the
 * hashrate feed is unavailable it degrades to the plain champion (no gate).
 * When it does NOT work: in a persistent downtrend below the 200-day average it
 * stays idle; and if the hashrate gate is too strict it simply trades less.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Hashrate regime gate: only buy when hashrate is above its 30-day average
  // (miners committed, network strengthening). Degrade gracefully if null.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  if (hr != null && hrSma != null && hr <= hrSma) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
