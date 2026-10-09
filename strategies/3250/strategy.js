/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR Bull-Regime Only
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: deep flushes to the lower Keltner band are bought back
 * quickly in an uptrend (mean reversion). The regime filter keeps us out of
 * downtrends and sideways chop below the 50/200-day alignment, where a flush
 * is usually the start of a fall, not a bargain.
 * When it buys and sells: buys only when price closes below the 20-day EMA
 * minus 2.5x ATR with RSI below 40, AND the market is in a confirmed bull
 * regime (price above the 200-day average and the 50-day above the 200-day).
 * Sells on the snap-back to the 20-day EMA. Stays in cash otherwise.
 * When it does NOT work: in a bull market that never pulls back it never
 * enters (no flush), and in a sideways chop above the 200-day it whipsaws.
 * It underperforms buy-and-hold in straight-up years and pays a fee on every
 * round trip. Defensive first.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || sma50 == null || rsi == null || atr <= 0) return null;

  const st = ctx.state;

  if (pos > 0) {
    // Exit on snap-back to the middle band (20-day EMA).
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // REGIME FILTER: only trade in a confirmed uptrend.
  // 50-day above 200-day = golden alignment; price above 200-day = trend intact.
  if (!(price > sma200 && sma50 > sma200)) return null;

  // Mean-reversion entry: deep flush to the lower band with weak momentum.
  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush, rare enough to avoid overtrading
  if (price <= lower && rsi < 40) {
    st.entryType = 'mr';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9); // risk 1.5% of equity per trade
    return { side: 'buy', qty };
  }

  return null;
}
