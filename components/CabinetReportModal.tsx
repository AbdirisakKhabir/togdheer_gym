'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Boxes,
  X,
  Loader2,
  ClipboardList,
} from 'lucide-react';

type CabinetPaymentReport = {
  id: number;
  paidAmount: number;
  discount: number;
  balance: number;
  date: string;
  user: { username: string };
  assignment: {
    cabinet: { code: string; monthlyPrice: number };
    customer: { name: string; phone: string | null };
  };
};

type ReportTotals = {
  totalPaid: number;
  totalDiscount: number;
  totalRecordedBalance: number;
  paymentCount: number;
};

type CabinetOverview = {
  totalCabinets: number;
  occupied: number;
  available: number;
};

type ReportPayload = {
  payments: CabinetPaymentReport[];
  totals: ReportTotals;
  cabinetOverview: CabinetOverview;
  period: { startDate: string; endDate: string };
};

interface CabinetReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CabinetReportModal({ isOpen, onClose }: CabinetReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cabinetCode, setCabinetCode] = useState('');
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
      setCabinetCode('');
      setReportData(null);
    }
  }, [isOpen]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const generateReport = async () => {
    if (!startDate || !endDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Dates required',
        text: 'Choose a start and end date.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports/cabinet-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          ...(cabinetCode.trim() ? { cabinetCode: cabinetCode.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Report failed');

      setReportData(data as ReportPayload);
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Could not load report',
        text: e instanceof Error ? e.message : 'Try again.',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCsv = () => {
    if (!reportData) return;
    const headers = ['Date', 'Cabinet', 'Member', 'Phone', 'Paid', 'Discount', 'Balance', 'User'];
    const rows = reportData.payments.map((p) => [
      new Date(p.date).toLocaleDateString(),
      p.assignment.cabinet.code,
      p.assignment.customer.name,
      p.assignment.customer.phone || '',
      p.paidAmount,
      p.discount,
      p.balance,
      p.user.username,
    ]);
    const blob = new Blob([[headers.join(','), ...rows.map((r) => r.join(','))].join('\n')], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cabinet-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-6xl max-h-[94vh] flex flex-col my-4">
        <header className="flex items-start justify-between gap-4 p-5 border-b border-gray-200 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cabinet report</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Locker payments and occupancy for a date range (your gender access applies).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <section className="p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cabinet code (optional)
              </label>
              <input
                type="text"
                value={cabinetCode}
                onChange={(e) => setCabinetCode(e.target.value)}
                placeholder="Contains…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              disabled={isGenerating}
              onClick={generateReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Generate
            </button>
            {reportData && (
              <button
                type="button"
                onClick={exportCsv}
                className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Export CSV
              </button>
            )}
          </div>
        </section>

        <div className="p-5 overflow-y-auto flex-1">
          {reportData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <p className="text-xs font-medium text-gray-500">Payments in period</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totals.paymentCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <p className="text-xs font-medium text-gray-500">Total paid</p>
                  <p className="text-2xl font-bold text-blue-600">{formatMoney(reportData.totals.totalPaid)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <p className="text-xs font-medium text-gray-500">Total discount</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatMoney(reportData.totals.totalDiscount)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Boxes className="w-4 h-4" />
                    Cabinets (now)
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {reportData.cabinetOverview.occupied} in use ·{' '}
                    {reportData.cabinetOverview.available} free
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {reportData.cabinetOverview.totalCabinets} total units
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Cabinet</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Member</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Paid</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden sm:table-cell">
                          Discount
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">
                          User
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                            No cabinet payments in this period.
                          </td>
                        </tr>
                      ) : (
                        reportData.payments.map((p) => (
                          <tr key={p.id} className="bg-white hover:bg-gray-50/80">
                            <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.date)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {p.assignment.cabinet.code}
                            </td>
                            <td className="px-4 py-3">
                              <div>{p.assignment.customer.name}</div>
                              <div className="text-xs text-gray-500">
                                {p.assignment.customer.phone || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-600">
                              {formatMoney(p.paidAmount)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                              {formatMoney(p.discount)}
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                              {p.user.username}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12 text-sm">
              Set dates and choose Generate to load cabinet payments and occupancy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
