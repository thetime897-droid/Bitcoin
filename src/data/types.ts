export interface TickerState {
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24hBase: number;
  updatedAt: number;
}

export interface DepthLevel {
  price: number;
  qty: number;
}

export interface OrderBookState {
  bids: DepthLevel[]; // sorted best (highest) first
  asks: DepthLevel[]; // sorted best (lowest) first
  bidWallUsd: number;
  askWallUsd: number;
  updatedAt: number;
}

export type LiquidationSide = 'long' | 'short';

export interface LiquidationEvent {
  id: string;
  side: LiquidationSide; // which position type got liquidated
  price: number;
  qtyBase: number;
  usd: number;
  time: number;
}

export interface TradeEvent {
  id: string;
  price: number;
  qtyBase: number;
  usd: number;
  isBuyerMaker: boolean; // true => sell-initiated (taker sold into bid)
  time: number;
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale';
