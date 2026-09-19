/*
 * @coinsori-strategy v1
 * name: Donchian Channel Breakout v2
 * ex: binance
 * syms: ETHUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Breakout strategies are a completely different signal family from
 * the mean-reversion and EMA-crossover approaches already tested. Donchian channels catch
 * sustained moves after consolidation — ETH and SOL are liquid enough for this.
 * When it buys and sells: Buys when price closes above the 20-bar highest high (breakout
 * above resistance). Exits when price closes below the 20-bar lowest low (breakdown).
 * ATR-based stop prevents one bad trade from wiping out many winners.
 * When it does NOT work: Whipsaws badly in choppy markets where price oscillates around
 * the channel without trending. High volatility assets like SOL can give false breakouts.
 */
function onUpdate(ctx) {
    const dcLen  = 20;   // Donchian lookback
    const atrLen = 14;   // ATR lookback
    const atrMult = 2.0; // Stop = entry - atrMult × ATR

    // All indicators read from PREVIOUS closed bar (ago=1) so they are stable
    const hi     = ctx.high(dcLen, 1);  // 20-bar high of previous closed bars
    const lo     = ctx.low(dcLen, 1);   // 20-bar low of previous closed bars
    const atr    = ctx.atr(atrLen, 1);  // ATR of previous closed bars

    if (hi == null || lo == null || atr == null) return null;

    // closes[1] = prev bar close, closes[2] = bar before that
    const closes = ctx.closes;
    if (!closes || closes.length < 3) return null;

    const curClose  = closes[0];   // current (forming) bar close
    const prevClose = closes[1];  // previous closed bar close
    const prev2Close = closes[2]; // bar before that

    // Previous bar's Donchian levels (for confirmation)
    const prevHi = ctx.high(dcLen, 2);
    const prevLo = ctx.low(dcLen, 2);
    if (prevHi == null || prevLo == null) return null;

    const hasPosition = ctx.position > 0;
    const entryPx     = ctx.entryPx;

    // ── ENTRY: no position, price breaks above 20-bar high ──
    if (!hasPosition) {
        // Prev bar close ≤ prev bar's 20-bar high AND
        // Cur bar close > prev bar's 20-bar high → breakout confirmed
        if (prev2Close <= prevHi && prevClose > hi) {
            const stopPx = prevClose - atrMult * atr;
            return {
                side: 'buy',
                qty: ctx.cash / prevClose * 0.99,
                stopPx: stopPx
            };
        }
    }

    // ── EXIT: have position ──
    if (hasPosition) {
        // Exit signal: price closes below 20-bar low
        if (prev2Close > prevLo && prevClose < lo) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: price hits entry - atrMult × ATR
        const stopPx = entryPx - atrMult * atr;
        if (curClose <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
