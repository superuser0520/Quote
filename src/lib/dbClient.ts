import type { Quotation, DeliveryOrder, Invoice, CompanyProfile } from '../types';
import { loadCompanyProfile, normalizeCompanyProfile, saveQuotations, saveDeliveryOrders, saveInvoices, saveCompanyProfile } from './storage';

export interface DatabaseState {
  quotations: Quotation[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  companyProfile: CompanyProfile;
}

const PENDING = 'quotation_tool_pending_database_v1';
const validDatabase = (data: any): data is DatabaseState => data && Array.isArray(data.quotations)
  && Array.isArray(data.deliveryOrders) && Array.isArray(data.invoices);

export function pendingDatabase(): DatabaseState | null {
  try {
    const data = JSON.parse(localStorage.getItem(PENDING) || 'null');
    return validDatabase(data) && data.companyProfile ? data : null;
  } catch { return null; }
}

export function cacheDatabase(state: DatabaseState) {
  saveQuotations(state.quotations);
  saveDeliveryOrders(state.deliveryOrders);
  saveInvoices(state.invoices);
  saveCompanyProfile(state.companyProfile);
}

export async function fetchServerDatabase(): Promise<DatabaseState | null> {
  try {
    const res = await fetch('/api/db', { headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!validDatabase(data)) return null;
    return {...data, companyProfile: normalizeCompanyProfile(data.companyProfile || loadCompanyProfile())};
  } catch (error) { console.warn('Could not load server database:', error); return null; }
}

// Serialize requests from this browser so an older save cannot finish after a newer save.
let saveQueue: Promise<unknown> = Promise.resolve();
export function saveServerDatabase(state: DatabaseState): Promise<boolean> {
  const snapshot = JSON.stringify(state);
  try {
    // Keep unsynced edits across refresh instead of replacing them with old server data.
    localStorage.setItem(PENDING, snapshot);
    cacheDatabase(state);
  } catch (error) { console.warn('Browser backup could not be saved:', error); }
  const save = saveQueue.then(async () => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: snapshot,
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return false;
      try { if (localStorage.getItem(PENDING) === snapshot) localStorage.removeItem(PENDING); } catch { /* Server save succeeded. */ }
      return true;
    } catch (error) { console.warn('Server save failed:', error); return false; }
  });
  saveQueue = save.catch(() => undefined);
  return save;
}
