/*
 * @coinsori-strategy v1
 * name: Bollinger Band + RSI Mean Reversion v4
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOLUSDT oscillates between mean-reversion phases (price overshoots
 * then snaps back to value) and trending phases. This strategy catches the overshoot
 * reversals using Bollinger Bands, confirmed by RSI exhaustion and EMA200 uptrend filter.
 * When it buys and sells: Buy when price touches the lower Bollinger Band with RSI below 30
 * while price is above EMA200 (uptrend). Sell when price reaches the middle band or RSI hits 70.
 * ATR-based stop provides dynamic risk management. When it does NOT work: Fails in sustained
 * one-directional trends where RSI stays overbought/oversold for extended periods.
 */
function onUpdate(ctx) {
  // State object persists across ticks; initialise entry bar tracking
  if (!ctx.state.entryBar) ctx.state.entryBar = 0;

  const sma20 = ctx.sma(20);
  if (sma20 == null) return null;

  const bb = ctx.bb(20, 2);
  if (bb == null || bb.lower == null || bb.mid == null) return null;

  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const atr = ctx.atr(14);
  if (atr == null) return null;

  // EMA200 as uptrend filter (price above EMA200 = confirmed uptrend)
  const ema200 = ctx.ema(200);
  if (ema200 == null) return null;
  const inUptrend = ctx.price > ema200;

  // Entry: price at/below lower BB, RSI oversold, in uptrend
  const atLower = ctx.price <= bb.lower;
  const rsiOversold = rsi < 30;

  if (ctx.position === 0 && atLower && rsiOversold && inUptrend) {
    ctx.state.entryBar = ctx.i; // record bar of entry
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit logic
  if (ctx.position > 0) {
    const profitPct = (ctx.price - ctx.entryPx) / ctx.entryPx * 100;

    // Take profit at middle band OR RSI overbought OR profit > 6%
    if (ctx.price >= bb.mid || rsi > 70 || profitPct > 6) {
      return { side: 'sell', qty: ctx.position };
    }

    // ATR-based stop loss: price 1.5× ATR below entry
    const atrStop = ctx.entryPx - atr * 1.5;
    if (ctx.price < atrStop) {
      return { side: 'sell', qty: ctx.position };
    }

    // Time-based exit: close after 6 bars (24h) if profit < 1%
    const barsHeld = ctx.i - ctx.state.entryBar;
    if (barsHeld >= 6 && profitPct < 1) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
