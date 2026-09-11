/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe Mean Reversion with Macro Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines mean reversion logic across multiple timeframes (1h and 4h) to improve signal reliability, while also filtering trades based on macro sentiment. It capitalizes on the idea that market reversals are more likely when price is deviating significantly from its moving average in a trending environment.
 * When it buys and sells: The strategy looks for buy signals on the 1h chart when price crosses above the 20-period SMA, and sell signals when it crosses below. It uses the 4h chart to confirm trend direction before entering positions, and additionally filters trades based on fear & greed sentiment being 'Neutral' or 'Greed'.
 * When it does NOT work: This strategy struggles in strong trending markets where price continues moving in one direction for extended periods, or when macro sentiment is highly volatile. It may also underperform during news events that cause large, unexpected moves.
 */
function onUpdate(ctx) {
  // === 데이터 로드 ===
  const fearGreed = ctx.data('fg'); // Fear & Greed Index data (from DB via ctx.data)
  
  // === 1h 차트 지표 ===
  const ma1h = ctx.sma(20, 0);
  const prevMa1h = ctx.sma(20, 1);
  const price1h = ctx.price;
  
  // === 4h 차트 지표 ===
  const ma4h = ctx.sma(20, 0); 
  const prevMa4h = ctx.sma(20, 1); 

  // === 위험 필터 ===
  if (fearGreed == null) return null;         // Fear & Greed index not available
  if (ma1h == null || ma4h == null) return null;    // Not enough data for SMAs

  // === 트렌드 필터 (4h 차트) ===
  const trendUp = ma4h > prevMa4h;
  const trendDown = ma4h < prevMa4h;

  // === 매수 조건 (1h 차트) ===
  const buySignal1h = price1h > ma1h && prevMa1h <= ma1h; // Price crosses above SMA

  // === 매도 조건 (1h 차트) ===  
  const sellSignal1h = price1h < ma1h && prevMa1h >= ma1h; // Price crosses below SMA

  // === MACRO SENTIMENT 필터 ===
  // Only allow trades when fear/greed sentiment is 'Neutral' or 'Greed' (indices 50-100)
  const macroFilter = fearGreed >= 50;

  // === 진입 조건 정의 ===
  if (buySignal1h && trendUp && macroFilter) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellSignal1h && trendDown && macroFilter) {
    return { side: 'sell', qty: ctx.position };
  }

  // === 기존 포지션 유지 ===
  return null;
}
