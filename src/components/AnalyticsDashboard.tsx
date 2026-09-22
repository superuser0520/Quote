import React, { useMemo, useState } from 'react';
import { Invoice, Quotation } from '../types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calculator, CheckCircle2, DollarSign, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { quotationPaymentStatus } from '../lib/workflows';

interface AnalyticsDashboardProps {
  quotations: Quotation[];
  invoices: Invoice[];
  currency?: string;
}

const PO_STATUSES: Quotation['status'][] = ['PO Received', 'DO Issued', 'Invoice Issued', 'Paid'];

const capitalCost = (quotation: Quotation) =>
  quotation.items.reduce(
    (total, item) => total + (item.unitCost && item.unitCost > 0 ? item.unitCost * item.quantity : 0),
    0,
  );

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  quotations,
  invoices,
  currency = 'MYR',
}) => {
  const [selectedYear, setSelectedYear] = useState('all');

  const poQuotations = useMemo(
    () => quotations.filter((quote) => PO_STATUSES.includes(quote.status) && Boolean(quote.poNumber)),
    [quotations],
  );

  const availableYears = useMemo(() => {
    const years = new Set(
      poQuotations
        .map((quote) => quote.poReceivedDate || quote.date)
        .filter(Boolean)
        .map((date) => date.substring(0, 4)),
    );
    return Array.from(years).sort().reverse();
  }, [poQuotations]);

  const filteredPOs = useMemo(() => {
    if (selectedYear === 'all') return poQuotations;
    return poQuotations.filter((quote) =>
      (quote.poReceivedDate || quote.date).startsWith(selectedYear),
    );
  }, [poQuotations, selectedYear]);

  const isPaid = (quote: Quotation) => quotationPaymentStatus(quote, invoices) === 'Paid';

  const filteredQuotations = useMemo(() => {
    if (selectedYear === 'all') return quotations;
    return quotations.filter((quote) => quote.date.startsWith(selectedYear));
  }, [quotations, selectedYear]);

  const quotationConversionRate = filteredQuotations.length > 0
    ? (filteredPOs.length / filteredQuotations.length) * 100
    : 0;

  const financials = useMemo(() => {
    return filteredPOs.reduce(
      (totals, quote) => {
        const revenue = quote.grandTotal;
        const capital = capitalCost(quote);
        const profit = revenue - capital;
        totals.revenue += revenue;
        totals.capital += capital;
        totals.profit += profit;
        if (isPaid(quote)) {
          totals.realisedProfit += profit;
        } else {
          totals.unrealisedProfit += profit;
        }
        if (quote.items.some((item) => !item.unitCost || item.unitCost <= 0)) {
          totals.incompleteCostPOs += 1;
        }
        return totals;
      },
      { revenue: 0, capital: 0, profit: 0, realisedProfit: 0, unrealisedProfit: 0, incompleteCostPOs: 0 },
    );
  }, [filteredPOs, invoices]);

  const monthlyData = useMemo(() => {
    const months = new Map<string, {
      month: string;
      poRevenue: number;
      capitalSpend: number;
      realisedProfit: number;
      unrealisedProfit: number;
    }>();

    filteredPOs.forEach((quote) => {
      const month = (quote.poReceivedDate || quote.date).substring(0, 7);
      const row = months.get(month) || {
        month,
        poRevenue: 0,
        capitalSpend: 0,
        realisedProfit: 0,
        unrealisedProfit: 0,
      };
      const capital = capitalCost(quote);
      const profit = quote.grandTotal - capital;
      row.poRevenue += quote.grandTotal;
      row.capitalSpend += capital;
      if (isPaid(quote)) row.realisedProfit += profit;
      else row.unrealisedProfit += profit;
      months.set(month, row);
    });

    return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPOs, invoices]);

  const statusData = [
    { name: 'Unpaid', value: filteredPOs.filter((quote) => !isPaid(quote)).length, color: '#3b82f6' },
    { name: 'Paid', value: filteredPOs.filter((quote) => isPaid(quote)).length, color: '#10b981' },
  ].filter((item) => item.value > 0);

  const money = (value: number) =>
    `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    {
      label: 'Total PO Revenue',
      value: financials.revenue,
      note: `${filteredPOs.length} confirmed purchase order${filteredPOs.length === 1 ? '' : 's'}`,
      icon: DollarSign,
      color: 'text-indigo-700',
      iconStyle: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Capital Spend',
      value: financials.capital,
      note: 'Actual entered unit costs for confirmed POs',
      icon: Calculator,
      color: 'text-amber-700',
      iconStyle: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Total PO Profit',
      value: financials.profit,
      note: 'PO revenue minus capital spend',
      icon: TrendingUp,
      color: financials.profit >= 0 ? 'text-emerald-700' : 'text-red-700',
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Unrealised Profit',
      value: financials.unrealisedProfit,
      note: 'Confirmed POs awaiting payment',
      icon: TrendingUp,
      color: 'text-blue-700',
      iconStyle: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Realised Profit',
      value: financials.realisedProfit,
      note: 'Profit from fully paid POs',
      icon: CheckCircle2,
      color: 'text-emerald-700',
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">PO Revenue & Profit Analytics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Revenue comes from confirmed PO values. Capital spend comes only from entered item costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-slate-500 pl-2">Year:</span>
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1.5 rounded-lg transition ${selectedYear === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
            >
              All Time
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg transition ${selectedYear === year ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {financials.incompleteCostPOs > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-semibold">
          {financials.incompleteCostPOs} confirmed PO{financials.incompleteCostPOs === 1 ? ' has' : 's have'} line items without a unit cost. Those missing costs are currently counted as zero; edit the quotation to enter accurate capital spend.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconStyle}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-black ${card.color}`}>{money(card.value)}</p>
              <p className="text-xs text-slate-500 mt-1">{card.note}</p>
            </div>
          );
        })}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quotation Conversion</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
              <PieIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-violet-700">{quotationConversionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">{filteredPOs.length} confirmed POs from {filteredQuotations.length} quotations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-base text-slate-900">Monthly Confirmed PO Performance</h3>
          <p className="text-xs text-slate-500 mt-1">PO revenue, capital spend, and realised/unrealised profit by PO received month.</p>

          {monthlyData.length > 0 ? (
            <div className="h-80 w-full mt-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    formatter={(value: number | string) => money(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="poRevenue" name="PO Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capitalSpend" name="Capital Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unrealisedProfit" name="Unrealised Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realisedProfit" name="Realised Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 mt-5 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
              <TrendingUp className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-xs font-semibold">No confirmed PO data for this period.</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            PO Payment Status
          </h3>
          <p className="text-xs text-slate-500 mt-1">Payment status follows the latest linked invoice.</p>

          {statusData.length > 0 ? (
            <div className="h-56 w-full my-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">No confirmed POs</div>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-700">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
