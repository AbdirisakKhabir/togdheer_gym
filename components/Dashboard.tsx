'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Loader2,
  UserPlus,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  members: {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    noExpireDate: number;
  };
  financials: {
    revenue: number;
    expenses: number;
    netIncome: number;
    totalBalances?: number;
  };
  period: {
    month: string;
    year: number;
  };
}

interface DashboardProps {
  onMembersList: () => void;
  onAddMember: () => void;
  onIncomeStatement: () => void;
  userName?: string | null;
   userRole?: string | null;
}

export default function Dashboard({
  onMembersList,
  onAddMember,
  onIncomeStatement,
  userName,
  userRole,
}: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load dashboard. Please refresh.
      </div>
    );
  }

  const { members, financials, period } = stats;
  const showFinancials = userRole !== 'staff';

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-blue-100 text-base sm:text-lg">
            Here's what's happening with your gym today.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6">
            <button
              onClick={onMembersList}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm font-semibold transition-all"
            >
              <Users className="w-5 h-5" />
              View Members
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onAddMember}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-semibold transition-all shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              Add New Member
            </button>
          </div>
        </div>
      </div>

      {/* Member Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Member Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={onMembersList}
            className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Members</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{members.active}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div
            onClick={onMembersList}
            className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{members.expiringSoon}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </div>

          <div
            onClick={onMembersList}
            className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{members.expired}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </div>

          <div
            onClick={onMembersList}
            className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{members.total}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview - hidden for staff users */}
      {showFinancials && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {period.month} {period.year} Financials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(financials.revenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">This month</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Balances</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(financials.totalBalances ?? 0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Owed by members</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(financials.expenses)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">This month</p>
                </div>
              </div>
            </div>

            <div
              onClick={onIncomeStatement}
              className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${financials.netIncome >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    <DollarSign className={`w-6 h-6 ${financials.netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Net Income</p>
                    <p className={`text-2xl font-bold ${financials.netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {formatCurrency(financials.netIncome)}
                    </p>
                  </div>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={onAddMember}
            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add New Member
          </button>
          <button
            onClick={onMembersList}
            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold transition-colors"
          >
            <Users className="w-5 h-5" />
            Members List
          </button>
          {showFinancials && (
            <button
              onClick={onIncomeStatement}
              className="flex items-center gap-3 px-6 py-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Income Statement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
