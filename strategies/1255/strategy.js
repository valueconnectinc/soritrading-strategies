/*
 * @coinsori-strategy v1
 * name: MACD Momentum Trend Following
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when MACD crosses above its signal line AND price is above a rising EMA200
 * (confirms trend alignment). Sells when MACD crosses below signal, or after a
 * 30-bar time stop if momentum stalls. A trailing ATR stop provides downside protection.
 * When it does NOT work: ranges sideways in tight bands — MACD flips repeatedly and
 * the EMA filter alone can't stop whipsaws, eroding small gains into losses.
 */
function onUpdate(ctx) {
  // ── Indicator warm-up guard ──────────────────────────────────────────
  const macdFast = 12, macdSlow = 26, macdSig = 9;
  const m1 = ctx.macd(macdFast, macdSlow, macdSig, 1);
  const m2 = ctx.macd(macdFast, macdSlow, macdSig, 2);
  if (m1 == null || m2 == null || m1.macd == null || m2.macd == null) return null;
  if (m1.signal == null || m2.signal == null) return null;

  const ema200 = ctx.ema(200, 1);
  if (ema200 == null) return null;

  const ema50 = ctx.ema(50, 1);
  if (ema50 == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  // ── State ──────────────────────────────────────────────────────────
  const pos = ctx.position;
  const price = ctx.price;

  // ── BUY: MACD crosses above signal + price above EMA200 (trend confirmed) ──
  if (pos === 0) {
    const macdRising = m1.macd > m1.signal && m2.macd <= m2.signal; // bullish cross
    const priceAboveTrend = price > ema200 && ema50 > ema200;        // both EMAs rising
    if (macdRising && priceAboveTrend) {
      ctx.log('BUY — MACD bullish cross, price above rising EMA200/EMA50');
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: MACD crosses below signal OR 30-bar time stop ──────────────
  if (pos > 0) {
    const macdDropping = m1.macd < m1.signal && m2.macd >= m2.signal; // bearish cross
    const entryPx = ctx.entryPx;

    // ATR-based trailing stop: exit if price falls 2.5 × ATR below session high
    const highSinceEntry = ctx.high(30); // highest high in last 30 bars
    const atrTrail = highSinceEntry - 2.5 * atr;
    const hitAtrStop = price < atrTrail && atrTrail < price * 0.97;

    // Time stop: exit if held > 30 bars without MACD cross
    const barsSinceEntry = ctx.i - (ctx.symState?.entryBar ?? ctx.i);
    const timeStop = barsSinceEntry > 30;

    if (macdDropping || hitAtrStop || timeStop) {
      ctx.log('SELL — macdDrop=' + macdDropping + ' atrStop=' + hitAtrStop + ' timeStop=' + timeStop);
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
