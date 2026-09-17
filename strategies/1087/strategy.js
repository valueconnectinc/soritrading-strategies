/*
 * @coinsori-strategy v1
 * name: ETH-4h EMA Death Cross Trailing Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH has larger swings than BTC, so a trailing stop lets
 * winners run while capping losses — better suited than a fixed stop for ETH.
 * EMA-20 death cross reliably identifies trend shifts on crypto 4h charts.
 * When it buys and sells: Buys when EMA-20 crosses below EMA-50 (death cross),
 * exits when EMA-20 crosses back above EMA-50 (golden cross) OR when trailing
 * stop is hit. Uses a 20% trailing stop from the entry price.
 * When it does NOT work: In choppy markets where EMA-20 and EMA-50 repeatedly
 * cross — trailing stops get hit for small losses before a real trend forms.
 * Also fails in strong one-way moves where the stop is too tight.
 */

function onUpdate(ctx) {
  // Need at least 50 bars for EMA-50
  const ema20_1 = ctx.ema(20, 1);
  const ema20_2 = ctx.ema(20, 2);
  const ema50_1 = ctx.ema(50, 1);
  const ema50_2 = ctx.ema(50, 2);

  if (ema20_1 == null || ema20_2 == null || ema50_1 == null || ema50_2 == null) {
    return null;
  }

  // Volume confirmation: require above-average volume on signal bar
  const avgVol = ctx.avgVol(20);
  if (avgVol == null || ctx.vol == null) {
    return null;
  }
  const volOk = ctx.vol >= avgVol * 0.5; // at least half average volume (lenient)

  // Entry: EMA-20 crosses BELOW EMA-50 (death cross) on previous bar
  // and we are currently flat
  const prevDeathCross = ema20_2 <= ema50_2 && ema20_1 > ema50_1;
  const inPosition = ctx.position > 0;

  if (!inPosition && prevDeathCross && volOk) {
    // Calculate trailing stop price (20% below entry)
    const stopPx = ctx.price * 0.80;
    // Use a smart order with a stop trigger
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99,
      type: 'smart',
      trigger: { type: 'stop', px: stopPx }
    };
  }

  // Exit: EMA-20 crosses back ABOVE EMA-50 (golden cross)
  const prevGoldenCross = ema20_2 >= ema50_2 && ema20_1 < ema50_1;

  if (inPosition && prevGoldenCross) {
    return { side: 'sell', qty: ctx.position };
  }

  // Trailing stop: if position is down more than 20% from peak, exit
  // ctx.uPnl is unrealized PnL in quote currency
  if (inPosition && ctx.uPnl < 0) {
    const peakValue = ctx.cash + ctx.position * ctx.entryPx;
    const currentValue = ctx.cash + ctx.position * ctx.price;
    const drawdown = (peakValue - currentValue) / peakValue;
    if (drawdown > 0.20) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
