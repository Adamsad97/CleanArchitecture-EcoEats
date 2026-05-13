export type OrderItemInput = {
  menuItemId:  string;
  name:        string;
  unitPrice:   number;
  quantity:    number;
  notes?:      string;
  optionValueIds?: string[];
};

export type CreateOrderInput = {
  userId:           string;
  restaurantId:     string;
  deliveryStreet:   string;
  deliveryCity:     string;
  items:            OrderItemInput[];
  deliveryFee:      number;
  tipAmount?:       number;
  paymentMethodId:  string;
  /** Valeurs calculées par l'entité Order du domaine (non recalculées en infra). */
  orderId?:          string;
  computedSubtotal?: number;
  computedTotal?:    number;
};

export type OrderSummary = {
  id:           string;
  status:       string;
  subtotal:     number;
  deliveryFee:  number;
  tipAmount:    number;
  total:        number;
  estimatedAt:  string;
};

export type OrderItemDetail = {
  id:          string;
  name:        string;
  description: string | null;
  photoUrl:    string | null;
  unitPrice:   number;
  quantity:    number;
  notes:       string | null;
};

export type OrderDetail = {
  id:                string;
  restaurantId:      string;
  restaurantName:    string;
  restaurantLogoUrl: string | null;
  status:            string;
  hasDriver:         boolean;
  items:             OrderItemDetail[];
  deliveryStreet:    string;
  deliveryCity:      string;
  subtotal:          number;
  deliveryFee:       number;
  total:             number;
  estimatedAt:       string;
  createdAt:         string;
};

export type OrderBasicInfo = {
  id:                string;
  restaurantId:      string;
  restaurantOwnerId: string;
  clientUserId:      string;
  status:            string;
};

export type RestaurantOrderItem = {
  id:        string;
  name:      string;
  photoUrl:  string | null;
  quantity:  number;
  unitPrice: number;
  notes:     string | null;
};

export type RestaurantOrder = {
  id:             string;
  restaurantId:   string;
  clientName:     string;
  status:         string;
  hasDriver:      boolean;
  items:          RestaurantOrderItem[];
  deliveryStreet: string;
  deliveryCity:   string;
  subtotal:       number;
  deliveryFee:    number;
  total:          number;
  createdAt:      string;
  estimatedAt:    string;
};

export type InvoiceData = {
  orderId:        string;
  restaurantName: string;
  items:          Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal:       number;
  deliveryFee:    number;
  tipAmount:      number;
  total:          number;
  createdAt:      string;
};

export interface IOrderRepository {
  create(input: CreateOrderInput): Promise<OrderSummary>;
  findAllByUserId(userId: string): Promise<OrderDetail[]>;
  findAllByRestaurantId(restaurantId: string): Promise<RestaurantOrder[]>;
  findById(orderId: string): Promise<OrderBasicInfo | null>;
  updateStatus(orderId: string, status: string): Promise<void>;
  updateEstimatedTime(orderId: string, prepMinutes: number): Promise<void>;
  findByIdForInvoice(orderId: string, userId: string): Promise<InvoiceData | null>;
}
