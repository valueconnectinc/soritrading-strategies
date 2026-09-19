/*
 * @coinsori-strategy v1
 * name: EMA 9/20 Crossover + ATR Risk — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following EMA crossover: buys when the 9 EMA crosses above the
 * 20 EMA (momentum shift), confirmed by RSI in the 42–68 zone (building
 * momentum, not overheated). ATR sets the stop at 1.8× and target at 2.5×.
 * Sells on the reverse EMA cross, RSI > 74, or risk-based stop/target.
 * Works in sustained directional trends. Fails in choppy markets where
 * EMAs cross repeatedly — each cross triggers a trade that stops out,
 * slowly eroding capital before a real trend arrives.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const ema9  = ctx.ema(9, 1);
  const ema20 = ctx.ema(20, 1);
  const rsi   = ctx.rsi(14, 1);
  const atr   = ctx.atr(14, 1);
  if (ema9 == null || ema20 == null || rsi == null || atr == null) return null;

  // ── Crossover: compare current vs previous bar ─────────────────────
  const ema9p  = ctx.ema(9, 2);
  const ema20p = ctx.ema(20, 2);
  if (ema9p == null || ema20p == null) return null;

  const bullCross = ema9p <= ema20p && ema9 > ema20;   // 9 crosses above 20
  const bearCross = ema9p >= ema20p && ema9 < ema20;   // 9 crosses below 20

  // ══ BUY ───────────────────────────────────────────────────────────
  if (pos === 0 && bullCross) {
    // RSI 42–68 = momentum building, not overheated
    if (rsi >= 42 && rsi <= 68) {
      const stopPx = price - 1.8 * atr;
      const risk   = price - stopPx;
      if (risk <= 0) return null;
      // 2% risk per trade → fixed qty
      const qty = (ctx.cash * 0.02) / risk;
      if (qty > 0) {
        ctx.log('BUY — EMA cross up, RSI=' + rsi.toFixed(1) + ', ATR=' + atr.toFixed(3));
        return { side: 'buy', qty: qty * 0.99 };
      }
    }
  }

  // ══ SELL ─────────────────────────────────────────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx - 1.8 * atr;
    const tpPx    = entryPx + 2.5 * atr;

    const emaExit   = bearCross;
    const rsiRich   = rsi > 74;
    const hitStop   = price <= stopPx;
    const hitTarget = price >= tpPx;

    if (emaExit || rsiRich || hitStop || hitTarget) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1) + ' exit=' +
        (emaExit ? 'EMA' : rsiRich ? 'RSI' : hitStop ? 'stop' : 'target'));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
