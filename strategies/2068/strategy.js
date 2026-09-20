/*
 * @coinsori-strategy v1
 * name: BB Width Squeeze Breakout
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Band Width squeezing to historically narrow levels
 * precedes explosive moves — the squeeze releases energy. Combined with ATR regime
 * filter to stay in chop, this catches directional breakouts while avoiding
 * fake-outs in ranging markets.
 * When it buys and sells: Enters when BB width hits its lowest 20% of the
 * last-100-bar range AND ATR confirms trending regime AND volume surges 1.5x
 * the 20-bar average. Exits on RSI reaching 70 (overbought) or 30 (oversold),
 * or if ATR regime flips back to chop.
 * When it does NOT work: In sustained one-directional trends, the squeeze
 * triggers late after the best entry; RSI exits early missing the bulk of the
 * move. High-fee environments erode small breakout gains.
 */

function onUpdate(ctx) {
  // ── Warm-up guard ─────────────────────────────────────────────────────────
  const sma20 = ctx.sma(20);
  const ema9 = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const atr14 = ctx.atr(14);
  const atr50 = ctx.atr(50);
  if (sma20 == null || ema9 == null || ema21 == null || atr14 == null || atr50 == null) return null;

  const position = ctx.position;
  const price   = ctx.price;
  const cash    = ctx.cash;

  // ── ATR Regime: chop (<0.65) vs trending (>0.90) ──────────────────────────
  const atrRatio = atr14 / atr50;
  const isTrending = atrRatio > 0.90;
  // isChop is the inverse — only use it to skip entries, not to force exits
  const isChop = atrRatio < 0.65;

  // ── Bollinger Band Width squeeze ──────────────────────────────────────────
  // BB(20,2): upper and lower bands
  const bb20 = ctx.bb(20, 2);
  if (bb20 == null || bb20.upper == null || bb20.lower == null) return null;
  const bwCurrent = bb20.upper - bb20.lower;

  // Rolling window of last 100 bars for BB width percentile
  // We approximate by reading closes array directly (ctx.closes has all bars so far)
  const closes = ctx.closes;
  const n = closes.length;
  if (n < 100) return null;

  // Compute BB width for each of the last 100 closed bars
  let bwMin = Infinity, bwMax = -Infinity;
  for (let i = n - 100; i < n - 1; i++) {   // exclude current bar (still forming)
    const hi = ctx.high(i);
    const lo = ctx.low(i);
    if (hi == null || lo == null) continue;
    const bw = hi - lo;
    if (bw < bwMin) bwMin = bw;
    if (bw > bwMax) bwMax = bw;
  }
  const bwRange = bwMax - bwMin;
  const bwPercentile = bwRange > 0 ? (bwCurrent - bwMin) / bwRange : 0.5;
  // Squeeze = BB width in bottom 20% of its 100-bar range
  const inSqueeze = bwPercentile < 0.20;

  // ── Volume surge ───────────────────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);  // avg vol of last 20 bars (ago=0 = current)
  if (avgVol == null || avgVol === 0) return null;
  const volSurge = ctx.vol > avgVol * 1.5;  // current vol 1.5x 20-bar average

  // ── RSI (14) for entry confirmation and exit ───────────────────────────────
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // ── EMA alignment for direction ────────────────────────────────────────────
  // Bullish: EMA9 above EMA21; Bearish: EMA9 below EMA21
  const emaBullish = ema9 > ema21;
  const emaBearish = ema9 < ema21;

  // ── ATR-based stop-loss distance ───────────────────────────────────────────
  // Stop = entry ± 1.5 × ATR14 (wider in trending, tighter in chop)
  const stopDist = atr14 * 1.5;

  // ─────────────────────────────────────────────────────────────────────────
  // EXIT LOGIC — run first, before any entry logic
  // ─────────────────────────────────────────────────────────────────────────
  if (position > 0) {
    // Long exit conditions
    const entryPx = ctx.entryPx;
    if (entryPx == null) return null;

    // Exit 1: RSI overbought
    if (rsi > 70) {
      ctx.log('EXIT: RSI overbought ' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
    // Exit 2: ATR flipped to chop (trend ended)
    if (isChop && atrRatio < 0.60) {
      ctx.log('EXIT: ATR regime flipped to chop ' + atrRatio.toFixed(3));
      return { side: 'sell', qty: position };
    }
    // Exit 3: Trailing stop — 2× ATR from peak price
    const peakPx = ctx.high(1) || price;  // approximate peak from last bar high
    if (price < peakPx - stopDist * 2) {
      ctx.log('EXIT: Trailing stop hit');
      return { side: 'sell', qty: position };
    }
    // No exit
    return null;
  }

  if (position < 0) {
    // Short exit conditions
    const entryPx = ctx.entryPx;
    if (entryPx == null) return null;

    // Exit 1: RSI oversold
    if (rsi < 30) {
      ctx.log('EXIT: RSI oversold ' + rsi.toFixed(1));
      return { side: 'buy', qty: Math.abs(position) };
    }
    // Exit 2: ATR flipped to chop
    if (isChop && atrRatio < 0.60) {
      ctx.log('EXIT: ATR regime flipped to chop ' + atrRatio.toFixed(3));
      return { side: 'buy', qty: Math.abs(position) };
    }
    // Exit 3: Trailing stop for short
    const troughPx = ctx.low(1) || price;
    if (price > troughPx + stopDist * 2) {
      ctx.log('EXIT: Short trailing stop hit');
      return { side: 'buy', qty: Math.abs(position) };
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENTRY LOGIC — only when flat
  // ─────────────────────────────────────────────────────────────────────────

  // Entry condition: squeeze releasing + trending + volume surge
  // We detect "squeeze releasing" when BW was in bottom 20% last bar
  // but is now expanding (BW percentile rising)
  const bwPrev = bb20.upper - bb20.lower;  // current bar still forming
  const wasSqueezed = bwPercentile < 0.20;  // current still in squeeze

  // True squeeze release = was squeezed (ago=1) and now expanding
  // Check previous bar's BW percentile
  let bwPrevMin = Infinity, bwPrevMax = -Infinity;
  for (let i = n - 101; i < n - 2; i++) {
    const hi = ctx.high(i);
    const lo = ctx.low(i);
    if (hi == null || lo == null) continue;
    const bw = hi - lo;
    if (bw < bwPrevMin) bwPrevMin = bw;
    if (bw > bwPrevMax) bwPrevMax = bw;
  }
  const bwPrevRange = bwPrevMax - bwPrevMin;
  // Approximate previous bar BW
  const bbPrev = ctx.bb(20, 2, 1);
  const bwPrevBar = (bbPrev && bbPrev.upper && bbPrev.lower)
    ? (bbPrev.upper - bbPrev.lower) : bwCurrent;
  const bwPrevPercentile = bwPrevRange > 0 ? (bwPrevBar - bwPrevMin) / bwPrevRange : 0.5;

  const squeezeReleasing = bwPrevPercentile < 0.25 && bwPercentile > bwPrevPercentile + 0.05;

  // ── LONG entry ─────────────────────────────────────────────────────────────
  // Squeeze releasing + trending + volume surge + RSI not overbought + EMA bullish
  if (squeezeReleasing && isTrending && volSurge && rsi < 65 && emaBullish) {
    ctx.log('LONG: Squeeze release + trending + vol surge. BW%=' + bwPercentile.toFixed(3) +
            ' ATRratio=' + atrRatio.toFixed(3) + ' RSI=' + rsi.toFixed(1));
    return {
      side: 'buy',
      qty: (cash * 0.95) / price,  // use 95% of cash
      // Attach stop-loss as a work order
      trigger: { side: 'sell', type: 'limit', price: price - stopDist, qty: 'position' }
    };
  }

  // ── SHORT entry ────────────────────────────────────────────────────────────
  // Squeeze releasing + trending + volume surge + RSI not oversold + EMA bearish
  if (squeezeReleasing && isTrending && volSurge && rsi > 35 && emaBearish) {
    ctx.log('SHORT: Squeeze release + trending + vol surge. BW%=' + bwPercentile.toFixed(3) +
            ' ATRratio=' + atrRatio.toFixed(3) + ' RSI=' + rsi.toFixed(1));
    return {
      side: 'sell',
      qty: (cash * 0.50) / price,  // short at 50% notional (leverage assumed elsewhere)
      trigger: { side: 'buy', type: 'limit', price: price + stopDist, qty: 'position' }
    };
  }

  return null;
}
