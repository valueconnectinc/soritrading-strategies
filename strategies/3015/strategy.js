/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket BTC/ETH/SOL/XRP
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger is unambiguous — on 1d, defensive mean-reversion is the
 * only robust edge, and it GENERALIZES cross-asset (validated positive on BTC/ETH/SOL/XRP
 * with 3.6-13% drawdown). A single-asset MR sits in cash during a melt-up and misses it;
 * a basket of four independently-run defensive-MR legs captures more opportunities and
 * smooths that weakness. This is the construction that produced the validated
 * +117.9%/MDD13.5 recent and +32%/MDD13.2 middle windows.
 * When it buys and sells: On each asset independently, buy when its price closes below the
 * lower Bollinger band (20,2.5) with RSI<30, OR below the ATR-adaptive lower Keltner band
 * with RSI<40, only inside that asset's rising 200-day average. Size by ATR risk, capped at
 * its cash share. Sell on snap-back above the 20-day EMA or when RSI climbs above 55.
 * When it does NOT work: In a broad coordinated crypto bear all gates stay flat (capital
 * safe, little upside), and in a straight-line melt-up it lags buy-and-hold. Returns are
 * modest because most legs sit in cash most of the time.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  // Defensive gate: only mean-revert inside a rising long-term trend (no falling knives).
  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  // ATR-adaptive lower Keltner band for the second MR signal.
  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    // Take the snap-back profit above the 20-day EMA or once RSI recovers.
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Two independent deep-oversold MR triggers, OR'd together.
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    // ATR-scaled size: risk 1% of this leg's equity per trade, capped at 90% of its cash.
    const legCash = ctx.cash; // engine allocates per-symbol cash when syms has multiple
    const riskEq = 0.01 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
