
export enum OrderStatus {
  PENDING = 'PENDING',
  ROUTED = 'ROUTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface RawOrder {
  id: string;
  [key: string]: string | number | undefined; // Flexible key for raw CSV data
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Order {
  id: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  note: string;
  cod: number;
  status: OrderStatus;
  originalData?: RawOrder;
  coordinates?: Coordinate; // Added for map positioning
}

export interface Shipper {
  id: string;
  name: string;
  phoneNumber: string;
  licensePlate: string;
  note: string;
}

export interface RouteConfig {
  startPoints: string[]; // Max 5
  maxOrdersPerShipper: number;
  maxClusters: number;
  costPerKm: number;
  costPerPoint: number; // New: Cost per delivery point
  currency: 'VND' | 'USD';
  maxKmPerShipper: number;
  trackAsiaApiKey?: string; // Changed from googleMapsApiKey
  geminiApiKey?: string; // New: For Smart Clustering
}

export interface Cluster {
  id: string;
  name: string;
  orders: Order[];
  totalDistanceKm: number;
  estimatedCost: number;
  extraFee: number;
  assignedShipperId: string | null;
  isCompleted: boolean;
  createdAt: number;
  color?: string; // For map visualization
  centroid?: Coordinate; // Center of the cluster
  geometry?: string; // Encoded polyline from VRP API
}

// Mapping config structure
export interface FieldMapping {
  customerName: string;
  phoneNumber: string;
  address: string;
  note: string;
  cod: string;
}

export type ViewState = 'IMPORT' | 'SHIPPERS' | 'PLANNING' | 'RESULTS' | 'HISTORY';