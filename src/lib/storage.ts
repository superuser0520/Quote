import { Quotation, DeliveryOrder, Invoice, CompanyProfile, GoogleSheetConfig } from '../types';

const STORAGE_KEYS = {
  QUOTATIONS: 'quotation_tool_quotes_v1',
  DELIVERY_ORDERS: 'quotation_tool_dos_v1',
  INVOICES: 'quotation_tool_invoices_v1',
  COMPANY_PROFILE: 'quotation_tool_company_profile_v1',
  SHEET_CONFIG: 'quotation_tool_sheet_config_v1',
};

export const defaultCompanyProfile: CompanyProfile = {
  name: 'Shimano Singapore',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  address: 'Tan Jun Yi\n11 Bulim Drive, Singapore 648105',
  email: 'tanjunyi@shimano.example.com',
  phone: '+65 6265 8111',
  taxId: '201938102-M',
  bankName: 'DBS Bank Ltd',
  bankAccountNo: '072-91028-4',
  bankAccountName: 'Shimano Singapore Pte Ltd',
  defaultTerms: '1. This quotation is valid for 60 days.\n2. Payment Terms: NET 30 days after item receival\n3. Leadtime: 1 week upon date of PO receival',
  defaultNotes: 'Thank you for your business!',
};

export const sampleQuotations: Quotation[] = [
  {
    id: 'q-30072601',
    quoteNumber: '30072601',
    client: {
      name: 'Soo Chee Siong',
      companyName: 'Huat Construction Metal Works',
      email: 'huatconstructionmetal@gmail.com',
      phone: '+60 12-789 9012',
      address: 'No 5 Jalan Pulai 25, Taman Pulai Utama\n81300 Skudai, Johor (JM0662094-A)',
    },
    date: '2026-07-30',
    validUntil: '2026-09-28',
    items: [
      {
        id: 'item-301',
        description: 'Intel Realsense Depth Camera D456',
        quantity: 1,
        unitPrice: 2500,
        taxRate: 0,
        discount: 0,
        remark: '',
        total: 2500,
      },
      {
        id: 'item-302',
        description: 'Intel Realsense Depth Camera D405',
        quantity: 1,
        unitPrice: 2000,
        taxRate: 0,
        discount: 0,
        remark: '',
        total: 2000,
      },
      {
        id: 'item-303',
        description: 'D-Link AX3000 WIFI 6 Router',
        quantity: 1,
        unitPrice: 400,
        taxRate: 0,
        discount: 0,
        remark: '',
        total: 400,
      },
    ],
    subtotal: 4900,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 4900,
    currency: 'MYR',
    status: 'Sent (Pending PO)',
    notes: '',
    terms: '1. This quotation is valid for 60 days.\n2. Payment Terms: NET 30 days after item receival\n3. Leadtime: 1 week upon date of PO receival',
    createdAt: '2026-07-30T10:00:00Z',
    updatedAt: '2026-07-30T10:00:00Z',
    syncedToSheet: false,
  },
  {
    id: 'q-101',
    quoteNumber: 'QT-2026-001',
    client: {
      name: 'Sarah Connor',
      companyName: 'Cyberdyne Systems Corp',
      email: 'sconnor@cyberdyne.example.com',
      phone: '+1 (555) 234-5678',
      address: '777 Tech Boulevard, Bldg 4, Silicon Valley, CA 94025',
    },
    date: '2026-07-20',
    validUntil: '2026-08-20',
    items: [
      {
        id: 'item-1',
        description: 'Enterprise Cloud Server Rack (42U Dual Power)',
        quantity: 2,
        unitPrice: 3500,
        taxRate: 8,
        discount: 5,
        total: 6650,
      },
      {
        id: 'item-2',
        description: 'Managed Fiber Routing Gateway Hub',
        quantity: 4,
        unitPrice: 750,
        taxRate: 8,
        discount: 0,
        total: 3240,
      },
    ],
    subtotal: 10000,
    taxTotal: 792,
    discountTotal: 350,
    grandTotal: 9890,
    currency: 'USD',
    status: 'Sent (Pending PO)',
    notes: 'Includes 12 months on-site technical maintenance.',
    terms: 'Payment terms: NET 30 from invoice receipt.',
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z',
    syncedToSheet: false,
  },
  {
    id: 'q-102',
    quoteNumber: 'QT-2026-002',
    client: {
      name: 'David Zhang',
      companyName: 'Horizon Robotics Ltd',
      email: 'dzhang@horizonrobotics.example.com',
      phone: '+65 9123 4567',
      address: '15 Science Park Drive, #02-01 Tech Centre, Singapore 118221',
    },
    date: '2026-07-25',
    validUntil: '2026-08-25',
    items: [
      {
        id: 'item-3',
        description: 'Automated Robotic Arm Controller V3',
        quantity: 1,
        unitPrice: 12500,
        taxRate: 9,
        discount: 0,
        total: 13625,
      },
    ],
    subtotal: 12500,
    taxTotal: 1125,
    discountTotal: 0,
    grandTotal: 13625,
    currency: 'USD',
    status: 'PO Received',
    poNumber: 'PO-HR-9821',
    poReceivedDate: '2026-07-28',
    poEmailSnippet: 'Please accept our official Purchase Order PO-HR-9821 for Quotation QT-2026-002.',
    poEmailSubject: 'Purchase Order Approval: QT-2026-002 (PO-HR-9821)',
    poEmailSender: 'dzhang@horizonrobotics.example.com',
    deliveryOrderId: 'do-102',
    deliveryOrderNumber: 'DO-2026-002',
    notes: 'Urgent dispatch requested by client.',
    terms: 'Payment terms: NET 30 from delivery.',
    createdAt: '2026-07-25T14:30:00Z',
    updatedAt: '2026-07-28T09:15:00Z',
    syncedToSheet: true,
  },
  {
    id: 'q-103',
    quoteNumber: 'QT-2026-003',
    client: {
      name: 'Elena Rostova',
      companyName: 'Vanguard BioTech Group',
      email: 'elena@vanguardbio.example.com',
      phone: '+44 20 7946 0912',
      address: '45 Oxford Science Square, London EC1A 1BB, UK',
    },
    date: '2026-07-15',
    validUntil: '2026-08-15',
    items: [
      {
        id: 'item-4',
        description: 'Precision Laboratory Thermal Cycler Unit',
        quantity: 3,
        unitPrice: 4200,
        taxRate: 0,
        discount: 10,
        total: 11340,
      },
    ],
    subtotal: 12600,
    taxTotal: 0,
    discountTotal: 1260,
    grandTotal: 11340,
    currency: 'USD',
    status: 'Invoice Issued',
    poNumber: 'PO-VBG-2026-44',
    deliveryOrderId: 'do-103',
    deliveryOrderNumber: 'DO-2026-003',
    invoiceId: 'inv-103',
    invoiceNumber: 'INV-2026-003',
    notes: 'Standard laboratory equipment warranty applies.',
    terms: 'Payment terms: NET 30 from invoice issue date.',
    createdAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-07-29T11:00:00Z',
    syncedToSheet: true,
  },
];

export const sampleDeliveryOrders: DeliveryOrder[] = [
  {
    id: 'do-102',
    doNumber: 'DO-2026-002',
    quotationId: 'q-102',
    quoteNumber: 'QT-2026-002',
    client: sampleQuotations[1].client,
    deliveryDate: '2026-07-30',
    deliveryAddress: sampleQuotations[1].client.address,
    driverName: 'Marcus Lee (Vehicle: WX-8921-Z)',
    vehicleNo: 'WX-8921-Z',
    trackingRef: 'TRK-881920',
    items: [
      {
        id: 'item-3',
        description: 'Automated Robotic Arm Controller V3',
        quantity: 1,
        notes: 'Serial S/N: ARC-2026-9921',
      },
    ],
    status: 'Delivered',
    deliveredAt: '2026-07-30T16:00:00Z',
    createdAt: '2026-07-28T10:00:00Z',
    updatedAt: '2026-07-30T16:00:00Z',
  },
  {
    id: 'do-103',
    doNumber: 'DO-2026-003',
    quotationId: 'q-103',
    quoteNumber: 'QT-2026-003',
    client: sampleQuotations[2].client,
    deliveryDate: '2026-07-28',
    deliveryAddress: sampleQuotations[2].client.address,
    driverName: 'DHL Express Air Freight',
    trackingRef: 'DHL-UK-9918231',
    items: [
      {
        id: 'item-4',
        description: 'Precision Laboratory Thermal Cycler Unit',
        quantity: 3,
        notes: 'Calibrated fragile units',
      },
    ],
    status: 'Delivered',
    deliveredAt: '2026-07-29T10:00:00Z',
    createdAt: '2026-07-28T12:00:00Z',
    updatedAt: '2026-07-29T10:00:00Z',
  },
];

export const sampleInvoices: Invoice[] = [
  {
    id: 'inv-103',
    invoiceNumber: 'INV-2026-003',
    quotationId: 'q-103',
    quoteNumber: 'QT-2026-003',
    poNumber: 'PO-VBG-2026-44',
    client: sampleQuotations[2].client,
    date: '2026-07-29',
    dueDate: '2026-08-28',
    items: sampleQuotations[2].items,
    subtotal: 12600,
    taxTotal: 0,
    discountTotal: 1260,
    grandTotal: 11340,
    currency: 'USD',
    paymentTerms: 'NET 30 Days',
    bankDetails: 'DBS Bank Ltd | Acc: 120-89024-5 | SWIFT: DBSSGSG',
    status: 'Unpaid',
    createdAt: '2026-07-29T11:00:00Z',
    updatedAt: '2026-07-29T11:00:00Z',
  },
];

// Persistence helpers
export const loadQuotations = (): Quotation[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
  if (!data) {
    saveQuotations(sampleQuotations);
    return sampleQuotations;
  }
  try {
    return JSON.parse(data);
  } catch {
    return sampleQuotations;
  }
};

export const saveQuotations = (quotes: Quotation[]) => {
  localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(quotes));
};

export const loadDeliveryOrders = (): DeliveryOrder[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_ORDERS);
  if (!data) {
    saveDeliveryOrders(sampleDeliveryOrders);
    return sampleDeliveryOrders;
  }
  try {
    return JSON.parse(data);
  } catch {
    return sampleDeliveryOrders;
  }
};

export const saveDeliveryOrders = (dos: DeliveryOrder[]) => {
  localStorage.setItem(STORAGE_KEYS.DELIVERY_ORDERS, JSON.stringify(dos));
};

export const loadInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  if (!data) {
    saveInvoices(sampleInvoices);
    return sampleInvoices;
  }
  try {
    return JSON.parse(data);
  } catch {
    return sampleInvoices;
  }
};

export const saveInvoices = (invoices: Invoice[]) => {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

export const loadCompanyProfile = (): CompanyProfile => {
  const data = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
  if (!data) {
    saveCompanyProfile(defaultCompanyProfile);
    return defaultCompanyProfile;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultCompanyProfile;
  }
};

export const saveCompanyProfile = (profile: CompanyProfile) => {
  localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profile));
};

export const loadSheetConfig = (): GoogleSheetConfig | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const saveSheetConfig = (config: GoogleSheetConfig | null) => {
  if (!config) {
    localStorage.removeItem(STORAGE_KEYS.SHEET_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
  }
};
