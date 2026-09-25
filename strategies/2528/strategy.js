/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid VolTargeted + TrailStop
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The vol-targeted regime-switch hybrid champion (2528) beats
 * buy-and-hold on every window but its documented weakness is drawdown (up to 39%
 * on BTC) because the trend leg rides a position all the way down to the 50-EMA
 * during a bull pullback, giving back a lot of profit. This variant adds ONE
 * conservative change: a trailing stop on the TREND leg only — once in a bull
 * position, it tracks the highest high since entry and exits if price closes below
 * the higher of the 50-EMA or that peak minus 2.5x ATR (whichever is tighter). This
 * locks in profit during pullbacks. The contrarian leg and vol-targeted sizing are
 * unchanged from 2528.
 * When it buys and sells: identical to 2528 — bear regime buys panic bottoms
 * (fear<40 + lower Bollinger break, mid-band exit); bull regime buys pullbacks to
 * the 20-EMA in a confirmed uptrend and exits on the new trailing stop. Sizing
 * stays vol-targeted (inverse ATR).
 * When it does NOT work: same as champion — sideways chop whipsaws the 50-EMA, and
 * a sharp V-reversal through the 50-EMA gives the trend leg no entry. The tighter
 * trailing stop can also cut a strong trend early during a normal shallow pullback.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    // hard stop: 3x ATR from entry (unchanged from champion)
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      // bear regime: mean-reversion exit at mid band
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      // TREND leg trailing stop: track the peak high since entry and exit when
      // price drops below the higher of the 50-EMA or peak minus 2.5x ATR.
      // 2.5x ATR is looser than the 3x hard stop from entry but tighter than the
      // 50-EMA during a strong run, so it protects profit without whipsawing.
      if (ctx.state.peak == null) ctx.state.peak = ctx.entryPx;
      const pb = ctx.high(1);
      if (pb != null && pb > ctx.state.peak) ctx.state.peak = pb;
      const trail = ctx.state.peak - atr * 2.5;
      const exitLevel = Math.max(ema50, trail);
      if (price < exitLevel) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // reset trailing peak when flat (next entry starts fresh)
  ctx.state.peak = null;

  // Volatility-targeted position size (unchanged from 2528)
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (bull) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
