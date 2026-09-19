/*
 * @coinsori-strategy v1
 * name: Donchian Channel Breakout + EMA Trend Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian breakouts are a classic trend-following entry —
 * price breaking above the 20-bar high signals institutional momentum. The EMA21
 * trend filter avoids buying breakouts in a downtrend (counter-trend trades that
 * fail). RSI confirmation filters out shake-outs. This combination is new to this
 * job — EMA crossover and BB mean-reversion are tested, but pure breakout is not.
 *
 * When it buys and sells:
 *   Buy: price closes above 20-bar high + EMA21 rising + RSI > 50
 *   Sell: price closes below 20-bar low OR ATR trailing stop hit OR RSI < 35
 *
 * When it does NOT work: choppy markets where price pierces the channel
 * boundary repeatedly (whipsaws). Also fails in slow grinding uptrends where
 * price never breaks the channel decisively.
 */

function onUpdate(ctx) {
  const pos    = ctx.position;
  const price  = ctx.price;

  // ── Warm-up guard ────────────────────────────────────────────────────
  const atr     = ctx.atr(14);
  const ema21   = ctx.ema(21);
  const ema21_1 = ctx.ema(21, 1);
  const rsi     = ctx.rsi(14);
  if (atr == null || ema21 == null || ema21_1 == null || rsi == null) return null;

  // ── Donchian 20-bar high/low (previous closed bar, ago=1 = safe) ────
  const dcHigh = ctx.high(20, 1);
  const dcLow   = ctx.low(20, 1);
  if (dcHigh == null || dcLow == null) return null;

  // ── Trend filter: EMA21 must be rising (bullish bias) ───────────────
  const emaRising = ema21 > ema21_1;

  // ── State for trailing stop ──────────────────────────────────────────
  if (!ctx.state.entryPx) ctx.state.entryPx = 0;
  if (!ctx.state.highest) ctx.state.highest = 0;

  // ── BUY: breakout above 20-bar high + EMA rising + RSI confirming ──
  if (pos === 0) {
    const breakout   = price > dcHigh;
    const rsiConfirm = rsi > 50;
    if (breakout && emaRising && rsiConfirm) {
      ctx.state.entryPx = price;
      ctx.state.highest = price;
      ctx.log('BUY breakout above ' + dcHigh.toFixed(1) + ' RSI=' + rsi.toFixed(1));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── HOLD: update trailing ATR stop ──────────────────────────────────
  if (pos > 0) {
    if (price > ctx.state.highest) ctx.state.highest = price;
    // 2× ATR trailing stop — moves up with price, never down
    const atrStop = ctx.state.highest - 2 * atr;

    // Exit triggers
    const belowChannel = price < dcLow;
    const rsiWeak      = rsi < 35;
    const atrTrailing  = price < atrStop && atrStop > 0;

    if (belowChannel || rsiWeak || atrTrailing) {
      ctx.state.entryPx = 0;
      ctx.state.highest = 0;
      const reason = belowChannel ? 'below-Donchian' : rsiWeak ? 'RSIweak' : 'ATRstop';
      ctx.log('SELL ' + reason + ' price=' + price.toFixed(1) + ' stop=' + atrStop.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
