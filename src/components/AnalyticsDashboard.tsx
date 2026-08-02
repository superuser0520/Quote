import React, { useState, useMemo } from 'react';
import { Quotation, Invoice } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Percent,
  Calculator,
  Server,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

interface AnalyticsDashboardProps {
  quotations: Quotation[];
  invoices: Invoice[];
  currency?: string;
  onOpenPiGuide: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  quotations,
  invoices,
  currency = 'MYR',
  onOpenPiGuide,
}) => {
  // Cost inputs state
  const [defaultCostMargin, setDefaultCostMargin] = useState<number>(40); // 40% estimated cost / COGS if no unitCost set
  const [monthlyOverhead, setMonthlyOverhead] = useState<number>(500); // Fixed monthly overhead cost
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Available Years Filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    quotations.forEach((q) => {
      if (q.date) years.add(q.date.substring(0, 4));
    });
    invoices.forEach((i) => {
      if (i.date) years.add(i.date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [quotations, invoices]);

  // Filtered lists by year
  const filteredQuotations = useMemo(() => {
    if (selectedYear === 'all') return quotations;
    return quotations.filter((q) => q.date && q.date.startsWith(selectedYear));
  }, [quotations, selectedYear]);

  const filteredInvoices = useMemo(() => {
    if (selectedYear === 'all') return invoices;
    return invoices.filter((i) => i.date && i.date.startsWith(selectedYear));
  }, [invoices, selectedYear]);

  // Conversion Metrics
  const totalQuotationsCount = filteredQuotations.length;
  const quotesWithPO = filteredQuotations.filter(
    (q) => q.status === 'PO Received' || q.status === 'DO Issued' || q.status === 'Invoice Issued' || q.status === 'Paid'
  ).length;
  const quotesInvoiced = filteredQuotations.filter(
    (q) => q.status === 'Invoice Issued' || q.status === 'Paid'
  ).length;
  const quotesPaid = filteredQuotations.filter((q) => q.status === 'Paid').length;

  const conversionRateToInvoiced = totalQuotationsCount > 0 ? ((quotesInvoiced / totalQuotationsCount) * 100) : 0;
  const conversionRateToPaid = totalQuotationsCount > 0 ? ((quotesPaid / totalQuotationsCount) * 100) : 0;

  // Monthly Financial Breakdown
  const monthlyData = useMemo(() => {
    const monthMap: {
      [key: string]: {
        month: string;
        invoicedRevenue: number;
        paidRevenue: number;
        estimatedCost: number;
        netProfit: number;
        quotesCount: number;
        invoicesCount: number;
      };
    } = {};

    // Process Invoices for Revenue
    filteredInvoices.forEach((inv) => {
      if (!inv.date) return;
      const monthKey = inv.date.substring(0, 7); // e.g. "2026-03"
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          invoicedRevenue: 0,
          paidRevenue: 0,
          estimatedCost: 0,
          netProfit: 0,
          quotesCount: 0,
          invoicesCount: 0,
        };
      }

      monthMap[monthKey].invoicedRevenue += inv.grandTotal;
      if (inv.status === 'Paid') {
        monthMap[monthKey].paidRevenue += inv.grandTotal;
      }

      // Calculate cost based on LineItem unitCost or fallback to margin %
      let invCost = 0;
      inv.items.forEach((item) => {
        if (item.unitCost !== undefined && item.unitCost > 0) {
          invCost += item.unitCost * item.quantity;
        } else {
          invCost += (item.total * (defaultCostMargin / 100));
        }
      });

      monthMap[monthKey].estimatedCost += invCost;
      monthMap[monthKey].invoicesCount += 1;
    });

    // Process Quotations for Counts
    filteredQuotations.forEach((q) => {
      if (!q.date) return;
      const monthKey = q.date.substring(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          invoicedRevenue: 0,
          paidRevenue: 0,
          estimatedCost: 0,
          netProfit: 0,
          quotesCount: 0,
          invoicesCount: 0,
        };
      }
      monthMap[monthKey].quotesCount += 1;
    });

    // Sort by month ascending
    const sorted = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate final net profit including fixed monthly overhead
    return sorted.map((m) => {
      const totalCostWithOverhead = m.estimatedCost + (m.invoicedRevenue > 0 ? monthlyOverhead : 0);
      const profit = m.paidRevenue - totalCostWithOverhead;
      return {
        ...m,
        estimatedCost: Math.round(totalCostWithOverhead * 100) / 100,
        netProfit: Math.round(profit * 100) / 100,
      };
    });
  }, [filteredInvoices, filteredQuotations, defaultCostMargin, monthlyOverhead]);

  // Overall Financial Totals
  const totalInvoicedRevenue = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  }, [filteredInvoices]);

  const totalPaidRevenue = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((acc, inv) => acc + inv.grandTotal, 0);
  }, [filteredInvoices]);

  const totalCalculatedCost = useMemo(() => {
    return monthlyData.reduce((acc, m) => acc + m.estimatedCost, 0);
  }, [monthlyData]);

  const totalNetProfit = totalPaidRevenue - totalCalculatedCost;
  const overallProfitMargin = totalPaidRevenue > 0 ? ((totalNetProfit / totalPaidRevenue) * 100) : 0;

  // Funnel Data for Pie Chart
  const conversionFunnelData = [
    { name: 'Drafts', value: filteredQuotations.filter((q) => q.status === 'Draft').length, color: '#94a3b8' },
    { name: 'Sent (Pending PO)', value: filteredQuotations.filter((q) => q.status === 'Sent (Pending PO)').length, color: '#f59e0b' },
    { name: 'PO Received / DO Issued', value: filteredQuotations.filter((q) => q.status === 'PO Received' || q.status === 'DO Issued').length, color: '#3b82f6' },
    { name: 'Invoice Issued (Unpaid)', value: filteredInvoices.filter((i) => i.status !== 'Paid').length, color: '#8b5cf6' },
    { name: 'Paid Invoices', value: quotesPaid, color: '#10b981' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">Sales & Profitability Analytics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time revenue tracking, quotation conversion rates, cost modeling, and net profit margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-slate-500 pl-2">Year:</span>
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedYear === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Raspberry Pi Self-Hosting Guide Trigger */}
          <button
            onClick={onOpenPiGuide}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 border border-indigo-500/30"
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Raspberry Pi & Self-Hosting</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Paid Revenue</span>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              {currency} {totalPaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-slate-600 font-semibold">
                Invoiced Total: {currency} {totalInvoicedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>

        {/* Estimated Total Cost Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Cost (COGS + Overhead)</span>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-700">
              {currency} {totalCalculatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Margin Estimate: {defaultCostMargin}% | Monthly Overhead: {currency} {monthlyOverhead}
            </p>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
          totalNetProfit >= 0 ? 'bg-emerald-950 text-white border-emerald-800' : 'bg-rose-950 text-white border-rose-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Net Profit</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              totalNetProfit >= 0 ? 'bg-emerald-800 text-emerald-200' : 'bg-rose-800 text-rose-200'
            }`}>
              {totalNetProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black">
              {currency} {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-80 mt-1 font-semibold flex items-center gap-1">
              <span>Profit Margin:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                overallProfitMargin >= 20 ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-800 text-amber-100'
              }`}>
                {overallProfitMargin.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>

        {/* Quote-to-Paid Conversion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quotation Conversion Rate</span>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-indigo-600">
              {conversionRateToPaid.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {quotesPaid} Paid / {totalQuotationsCount} Quotes Total ({conversionRateToInvoiced.toFixed(0)}% Invoiced)
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Cost & Profit Controls Box */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-indigo-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-black uppercase tracking-wider text-indigo-200">
            Cost & Profit Calculator Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cost Margin % Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>Default Product Cost / COGS Rate (%):</span>
              <span className="text-indigo-400 font-mono font-bold">{defaultCostMargin}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={defaultCostMargin}
              onChange={(e) => setDefaultCostMargin(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Fallback cost percentage applied if individual item unit cost is not entered.
            </p>
          </div>

          {/* Fixed Monthly Overhead Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Fixed Monthly Overhead Cost ({currency}):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{currency}</span>
              <input
                type="number"
                min="0"
                value={monthlyOverhead}
                onChange={(e) => setMonthlyOverhead(Math.max(0, Number(e.target.value)))}
                className="w-full pl-12 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fixed recurring overhead (e.g. rent, hosting, utilities) per active month.
            </p>
          </div>

          {/* Quick Summary Formula */}
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60 text-xs flex flex-col justify-center">
            <span className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Profit Formula</span>
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Net Profit = <strong>Paid Invoices</strong> − [ Sum(<strong>Line Item Unit Costs</strong> or Revenue × {defaultCostMargin}%) + {currency} {monthlyOverhead}/mo ]
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue vs. Cost vs. Net Profit Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Monthly Financial Performance</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparison of Invoiced Revenue, Estimated Cost, and Net Profit per month.
              </p>
            </div>
          </div>

          {monthlyData.length > 0 ? (
            <div className="h-80 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    formatter={(value: any) => [`${currency} ${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="invoicedRevenue" name="Invoiced Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paidRevenue" name="Paid Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estimatedCost" name="Total Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
              <TrendingUp className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-xs font-semibold">No invoice or quotation data available for this period.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Create quotations and generate invoices to see monthly trends.</p>
            </div>
          )}
        </div>

        {/* Quotation to Invoice Conversion Funnel Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              <span>Conversion Funnel Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quotations stage distribution from Draft to Paid Invoice.
            </p>

            {conversionFunnelData.length > 0 ? (
              <div className="h-56 w-full my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conversionFunnelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {conversionFunnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No quotations found
              </div>
            )}
          </div>

          {/* Conversion Funnel Legend List */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {conversionFunnelData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
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
