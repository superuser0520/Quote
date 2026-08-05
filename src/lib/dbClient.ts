import { Quotation, DeliveryOrder, Invoice, CompanyProfile } from '../types';
import {
  loadQuotations,
  saveQuotations,
  loadDeliveryOrders,
  saveDeliveryOrders,
  loadInvoices,
  saveInvoices,
  loadCompanyProfile,
  saveCompanyProfile,
  normalizeCompanyProfile,
} from './storage';

export interface DatabaseState {
  quotations: Quotation[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  companyProfile: CompanyProfile;
}

/**
 * Syncs local database state with Raspberry Pi backend /api/db.
 * Falls back to browser localStorage if server endpoint is unreachable or offline.
 */
export async function fetchServerDatabase(): Promise<DatabaseState | null> {
  try {
    const res = await fetch('/api/db', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.quotations || data.invoices || data.companyProfile) {
        return {
          quotations: data.quotations || loadQuotations(),
          deliveryOrders: data.deliveryOrders || loadDeliveryOrders(),
          invoices: data.invoices || loadInvoices(),
          companyProfile: normalizeCompanyProfile(data.companyProfile || loadCompanyProfile()),
        };
      }
    }
  } catch (err) {
    console.warn('Backend Pi database offline, using browser storage:', err);
  }
  return null;
}

/**
 * Saves database state to both Raspberry Pi backend /api/db and browser localStorage.
 */
export async function saveServerDatabase(state: {
  quotations: Quotation[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  companyProfile: CompanyProfile;
}): Promise<boolean> {
  // Save to browser localStorage first for immediate offline resilience
  saveQuotations(state.quotations);
  saveDeliveryOrders(state.deliveryOrders);
  saveInvoices(state.invoices);
  saveCompanyProfile(state.companyProfile);

  // Sync to Raspberry Pi backend file database
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not post to /api/db server:', err);
    return false;
  }
}
