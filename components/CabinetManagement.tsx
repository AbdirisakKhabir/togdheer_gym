'use client';

import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useSession } from 'next-auth/react';
import {
  Boxes,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Banknote,
  List,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type CabinetRow = {
  id: number;
  code: string;
  monthlyPrice: number;
  notes: string | null;
  activeAssignment: {
    id: number;
    startDate: string;
    endDate: string | null;
    customer: { id: number; name: string; phone: string | null; gender: string };
  } | null;
  assignmentCount: number;
};

type CustomerOption = { id: number; name: string; phone: string | null };

type CabinetPaymentRow = {
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

export default function CabinetManagement() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'boxes' | 'payments'>('boxes');
  const [cabinets, setCabinets] = useState<CabinetRow[]>([]);
  const [payments, setPayments] = useState<CabinetPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editCabinet, setEditCabinet] = useState<CabinetRow | null>(null);
  const [assignCabinet, setAssignCabinet] = useState<CabinetRow | null>(null);
  const [payAssignment, setPayAssignment] = useState<{
    assignmentId: number;
    cabinetCode: string;
    monthlyPrice: number;
    customerName: string;
  } | null>(null);
  const [listAssignment, setListAssignment] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [assignmentPayments, setAssignmentPayments] = useState<
    {
      id: number;
      paidAmount: number;
      discount: number;
      balance: number;
      date: string;
      user: { username: string };
    }[]
  >([]);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payPage, setPayPage] = useState(1);
  const itemsPerPage = 12;

  const fetchCabinets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cabinets');
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to load cabinets');
      }
      const data = await res.json();
      setCabinets(data);
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e instanceof Error ? e.message : 'Failed to load cabinets',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCabinetPayments = useCallback(async () => {
    try {
      setPayLoading(true);
      const res = await fetch('/api/cabinet-payments');
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to load payments');
      }
      const data = await res.json();
      setPayments(data);
      setPayPage(1);
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e instanceof Error ? e.message : 'Failed to load cabinet payments',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setPayLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch('/api/customers?page=1&limit=500&bypassDefault=1');
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data.customers || []);
  }, []);

  useEffect(() => {
    fetchCabinets();
  }, [fetchCabinets]);

  useEffect(() => {
    if (tab === 'payments') fetchCabinetPayments();
  }, [tab, fetchCabinetPayments]);

  useEffect(() => {
    if (assignCabinet) fetchCustomers();
  }, [assignCabinet, fetchCustomers]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleAddCabinet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get('code') || '').trim();
    const monthlyPrice = parseFloat(String(fd.get('monthlyPrice') || '0'));
    const notes = String(fd.get('notes') || '').trim();
    try {
      const res = await fetch('/api/cabinets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, monthlyPrice, notes: notes || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not create cabinet');
      setAddOpen(false);
      fetchCabinets();
      Swal.fire({
        icon: 'success',
        title: 'Cabinet added',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not add',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const handleUpdateCabinet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCabinet) return;
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get('code') || '').trim();
    const monthlyPrice = parseFloat(String(fd.get('monthlyPrice') || '0'));
    const notes = String(fd.get('notes') || '').trim();
    try {
      const res = await fetch(`/api/cabinets/${editCabinet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, monthlyPrice, notes: notes || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Update failed');
      setEditCabinet(null);
      fetchCabinets();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const handleDeleteCabinet = async (c: CabinetRow) => {
    const r = await Swal.fire({
      title: 'Delete cabinet?',
      text: `Remove box ${c.code} from the list? This is only allowed if it has no assignments on record.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!r.isConfirmed) return;
    try {
      const res = await fetch(`/api/cabinets/${c.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      fetchCabinets();
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const handleAssign = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignCabinet) return;
    const fd = new FormData(e.currentTarget);
    const customerId = fd.get('customerId');
    const startDate = String(fd.get('startDate') || '');
    const endRaw = fd.get('endDate');
    const endDate =
      endRaw && String(endRaw).trim() !== '' ? String(endRaw) : null;
    try {
      const res = await fetch(`/api/cabinets/${assignCabinet.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          startDate,
          endDate,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Assignment failed');
      setAssignCabinet(null);
      fetchCabinets();
      Swal.fire({
        icon: 'success',
        title: 'Cabinet assigned',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const handleRelease = async (assignmentId: number) => {
    const r = await Swal.fire({
      title: 'End this rental?',
      text: 'The cabinet will be available for a new member after today.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'End rental',
      confirmButtonColor: '#dc2626',
    });
    if (!r.isConfirmed) return;
    try {
      const res = await fetch(`/api/cabinet-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to end assignment');
      fetchCabinets();
      Swal.fire({ icon: 'success', title: 'Rental ended', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const handleRecordPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payAssignment || !session?.user?.id) return;
    const fd = new FormData(e.currentTarget);
    const paidAmount = parseFloat(String(fd.get('paidAmount') || '0'));
    const discount = parseFloat(String(fd.get('discount') || '0'));
    const balance = parseFloat(String(fd.get('balance') || '0'));
    const dateStr = String(fd.get('date') || '');
    try {
      const res = await fetch('/api/cabinet-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: payAssignment.assignmentId,
          paidAmount,
          discount,
          balance,
          date: dateStr || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Payment failed');
      setPayAssignment(null);
      fetchCabinets();
      if (tab === 'payments') fetchCabinetPayments();
      Swal.fire({
        icon: 'success',
        title: 'Payment recorded',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        text: err instanceof Error ? err.message : 'Error',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const openAssignmentPayments = async (assignmentId: number, label: string) => {
    setListAssignment({ id: assignmentId, label });
    try {
      const res = await fetch(`/api/cabinet-assignments/${assignmentId}/payments`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAssignmentPayments(data);
    } catch {
      setAssignmentPayments([]);
      Swal.fire({ icon: 'error', text: 'Could not load payments', confirmButtonColor: '#2563eb' });
    }
  };

  const todayInput = new Date().toISOString().split('T')[0];

  const paySliceStart = (payPage - 1) * itemsPerPage;
  const payTotalPages = Math.max(1, Math.ceil(payments.length / itemsPerPage));
  const paySlice = payments.slice(paySliceStart, paySliceStart + itemsPerPage);

  /** Lockers per horizontal shelf row (visual shelves). */
  const CABINETS_PER_SHELF = 6;
  const cabinetShelves = useMemo(() => {
    const rows: CabinetRow[][] = [];
    for (let i = 0; i < cabinets.length; i += CABINETS_PER_SHELF) {
      rows.push(cabinets.slice(i, i + CABINETS_PER_SHELF));
    }
    return rows;
  }, [cabinets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
          <button
            type="button"
            onClick={() => setTab('boxes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'boxes'
                ? 'bg-blue-500 text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Cabinets
          </button>
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'payments'
                ? 'bg-blue-500 text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Cabinet payments
          </button>
        </div>
        {tab === 'boxes' && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add cabinet
          </button>
        )}
      </div>

      {tab === 'boxes' && (
        <>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-stone-400/35 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 p-4 sm:p-6 md:p-8 shadow-[inset_0_2px_12px_rgba(255,255,255,0.35)]">
              {cabinets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-400/50 bg-white/60 p-12 text-center text-stone-500">
                  <Boxes className="w-14 h-14 mx-auto mb-3 text-stone-400" />
                  <p className="font-medium text-stone-700">No cabinets yet</p>
                  <p className="text-sm mt-1">Add a box to start assigning members.</p>
                </div>
              ) : (
                <div className="space-y-10 md:space-y-12">
                  {cabinetShelves.map((row, shelfIndex) => (
                    <div key={shelfIndex} className="relative">
                      {/* Wall pins / rail */}
                      <div
                        className="pointer-events-none absolute -left-1 top-0 bottom-8 w-1 rounded-full bg-gradient-to-b from-stone-400 to-stone-500 opacity-60 hidden sm:block"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute -right-1 top-0 bottom-8 w-1 rounded-full bg-gradient-to-b from-stone-400 to-stone-500 opacity-60 hidden sm:block"
                        aria-hidden
                      />

                      <div className="flex flex-wrap justify-center items-end gap-3 sm:gap-4 px-1 pb-0">
                        {row.map((c) => {
                          const occ = c.activeAssignment;
                          const occupied = Boolean(occ);
                          return (
                            <div
                              key={c.id}
                              className={`flex w-[140px] sm:w-[152px] flex-col rounded-t-lg border-2 shadow-lg transition-transform duration-200 hover:z-10 hover:-translate-y-0.5 ${
                                occupied
                                  ? 'border-amber-900/55 bg-gradient-to-b from-amber-200/95 via-orange-100 to-amber-50 shadow-amber-900/20'
                                  : 'border-slate-600/50 bg-gradient-to-b from-slate-50 to-emerald-50/90 shadow-slate-900/10'
                              }`}
                            >
                              {/* Locker door detail */}
                              <div
                                className={`mx-2 mt-2 h-1 rounded-full ${occupied ? 'bg-orange-400/50' : 'bg-emerald-500/35'}`}
                              />
                              <div className="flex flex-1 flex-col px-2.5 pb-2 pt-1.5 min-h-[200px]">
                                <div className="flex items-start justify-between gap-1">
                                  <h3 className="text-sm font-bold text-stone-900 leading-tight">
                                    {c.code}
                                  </h3>
                                  <span
                                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                      occupied
                                        ? 'bg-amber-900/80 text-amber-100'
                                        : 'bg-emerald-700 text-white'
                                    }`}
                                  >
                                    {occupied ? 'Full' : 'Free'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-600 mt-0.5">
                                  {formatMoney(c.monthlyPrice)}
                                  <span className="text-stone-400"> /mo</span>
                                </p>
                                {c.notes && (
                                  <p className="text-[10px] text-stone-500 mt-1 line-clamp-2 leading-snug">
                                    {c.notes}
                                  </p>
                                )}

                                {occ && (
                                  <div className="mt-2 flex-1 rounded-md border border-amber-900/15 bg-white/55 px-2 py-1.5 text-[11px] leading-snug">
                                    <p className="font-semibold text-stone-900 truncate" title={occ.customer.name}>
                                      {occ.customer.name}
                                    </p>
                                    <p className="text-stone-500 truncate">{occ.customer.phone || '—'}</p>
                                    <p className="text-stone-600 mt-1 text-[10px]">
                                      {formatDate(occ.startDate)}
                                      {' → '}
                                      {occ.endDate ? formatDate(occ.endDate) : 'Open'}
                                    </p>
                                  </div>
                                )}

                                {/* Door handle */}
                                <div className="flex justify-center my-1.5">
                                  <div
                                    className={`h-5 w-1.5 rounded-full ${
                                      occupied ? 'bg-amber-900/40' : 'bg-slate-500/35'
                                    }`}
                                  />
                                </div>

                                <div className="mt-auto flex flex-wrap gap-1 justify-center">
                                  {!occ ? (
                                    <button
                                      type="button"
                                      onClick={() => setAssignCabinet(c)}
                                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 w-full"
                                    >
                                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                      Assign
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPayAssignment({
                                            assignmentId: occ.id,
                                            cabinetCode: c.code,
                                            monthlyPrice: c.monthlyPrice,
                                            customerName: occ.customer.name,
                                          })
                                        }
                                        className="inline-flex flex-1 min-w-[56px] items-center justify-center gap-0.5 px-1.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700"
                                        title="Record payment"
                                      >
                                        <Banknote className="w-3 h-3" />
                                        Pay
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openAssignmentPayments(occ.id, `${c.code} · ${occ.customer.name}`)
                                        }
                                        className="inline-flex flex-1 min-w-[56px] items-center justify-center gap-0.5 px-1.5 py-1 rounded-md border border-stone-300 bg-white text-stone-800 text-[10px] font-semibold hover:bg-stone-50"
                                        title="Payment history"
                                      >
                                        <List className="w-3 h-3" />
                                        Log
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRelease(occ.id)}
                                        className="w-full inline-flex items-center justify-center gap-0.5 px-1.5 py-1 rounded-md border border-red-300 text-red-800 text-[10px] font-semibold hover:bg-red-50"
                                      >
                                        End rental
                                      </button>
                                    </>
                                  )}
                                  <div className="flex w-full gap-1 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => setEditCabinet(c)}
                                      className="inline-flex flex-1 items-center justify-center p-1.5 rounded-md border border-stone-300 bg-white/80 text-stone-700 hover:bg-white"
                                      title="Edit cabinet"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCabinet(c)}
                                      className="inline-flex flex-1 items-center justify-center p-1.5 rounded-md border border-red-200 bg-white/80 text-red-600 hover:bg-red-50"
                                      title="Delete cabinet"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Wooden shelf board */}
                      <div className="relative mx-0 mt-0 px-1">
                        <div
                          className="h-5 sm:h-6 rounded-b-md bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 shadow-[0_6px_12px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
                        />
                        <div className="absolute top-0 left-2 right-2 h-px bg-amber-600/50" />
                      </div>
                      <p className="sr-only">Shelf {shelfIndex + 1}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Cabinet payments</h2>
              <p className="text-sm text-gray-500 mt-1">
                Separate from membership payments — monthly locker fees only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchCabinetPayments()}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          {payLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Cabinet
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Member
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">
                        Balance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">
                        By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paySlice.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          No cabinet payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      paySlice.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {formatDate(p.date)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {p.assignment.cabinet.code}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">
                              {p.assignment.customer.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p.assignment.customer.phone || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                            {formatMoney(p.paidAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                            {formatMoney(p.balance)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                            {p.user.username}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-sm text-gray-600">
                  {payments.length === 0
                    ? '0 entries'
                    : `Showing ${paySliceStart + 1}–${Math.min(paySliceStart + itemsPerPage, payments.length)} of ${payments.length}`}
                </p>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    disabled={payPage <= 1}
                    onClick={() => setPayPage((x) => Math.max(1, x - 1))}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {payPage} / {payTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={payPage >= payTotalPages}
                    onClick={() =>
                      setPayPage((x) => Math.min(payTotalPages, x + 1))
                    }
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add cabinet */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">New cabinet</h3>
              <button type="button" onClick={() => setAddOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCabinet} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code / label</label>
                <input
                  name="code"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="e.g. A-12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly price (USD)</label>
                <input
                  name="monthlyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Create cabinet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit */}
      {editCabinet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Edit {editCabinet.code}</h3>
              <button type="button" onClick={() => setEditCabinet(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateCabinet} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  name="code"
                  required
                  defaultValue={editCabinet.code}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly price</label>
                <input
                  name="monthlyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editCabinet.monthlyPrice}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editCabinet.notes || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold">
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign */}
      {assignCabinet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign {assignCabinet.code}</h3>
                <p className="text-sm text-gray-500">
                  {formatMoney(assignCabinet.monthlyPrice)}/mo — cannot overlap another assignment.
                </p>
              </div>
              <button type="button" onClick={() => setAssignCabinet(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                <select
                  name="customerId"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Select member…</option>
                  {customers.map((cu) => (
                    <option key={cu.id} value={cu.id}>
                      {cu.name} {cu.phone ? `· ${cu.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  defaultValue={todayInput}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End date <span className="text-gray-400 font-normal">(optional — leave empty for open-ended)</span>
                </label>
                <input name="endDate" type="date" className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold">
                Assign cabinet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pay */}
      {payAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cabinet payment</h3>
                <p className="text-sm text-gray-500">
                  {payAssignment.cabinetCode} · {payAssignment.customerName}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Suggested monthly: {formatMoney(payAssignment.monthlyPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayAssignment(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid amount</label>
                <input
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={payAssignment.monthlyPrice}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                <input
                  name="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={0}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                <input
                  name="balance"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={0}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  name="date"
                  type="date"
                  defaultValue={todayInput}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">
                Record payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assignment payment history */}
      {listAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="text-lg font-bold text-gray-900 pr-2">{listAssignment.label}</h3>
              <button
                type="button"
                onClick={() => setListAssignment(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {assignmentPayments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No payments for this rental yet.</p>
              ) : (
                <ul className="space-y-3">
                  {assignmentPayments.map((row) => (
                    <li
                      key={row.id}
                      className="flex justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{formatMoney(row.paidAmount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(row.date)}</p>
                        <p className="text-xs text-gray-500">By {row.user.username}</p>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <p>Disc {formatMoney(row.discount)}</p>
                        <p>Bal {formatMoney(row.balance)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
