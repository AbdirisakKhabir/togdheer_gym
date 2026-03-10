'use client';

import {
  CreditCard,
  Users,
  UserPlus,
  BarChart3,
  Receipt,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
  UserCircle,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  onDashboard: () => void;
  onMembersList: () => void;
  onAddMember: () => void;
  onPaymentsList: () => void;
  onUsersList: () => void;
  onAddUser: () => void;
  onPaymentsReport: () => void;
  onExpenseReport: () => void;
  onIncomeStatement: () => void;
  onAddExpense: () => void;
  onExpensesList: () => void;
  onSettings: () => void;
  onLogout: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({
  onDashboard,
  onMembersList,
  onAddMember,
  onPaymentsList,
  onUsersList,
  onAddUser,
  onPaymentsReport,
  onExpenseReport,
  onIncomeStatement,
  onAddExpense,
  onExpensesList,
  onSettings,
  onLogout,
  isOpen = true,
  onToggle,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const menuItem = (
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    className?: string
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 hover:bg-white/10 ${className || 'text-gray-200'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onToggle && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white shadow-xl flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Logo & Brand */}
      <div className="relative p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2 w-full">
          <img
            src="/togdheer-logo.png"
            alt="Togdheer Gym"
            className="w-full h-28 rounded-xl object-contain shadow-lg"
          />
          
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute top-4 right-4 lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Dashboard */}
        <button
          onClick={onDashboard}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-white/5 transition-colors mb-2"
        >
          <LayoutDashboard className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Dashboard</span>
        </button>

        {/* Members */}
        <div className="mb-1">
          <button
            onClick={() => toggle('members')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Members</span>
            </div>
            {expanded === 'members' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded === 'members' && (
            <div className="pl-4 pb-2 space-y-1">
              {menuItem(onMembersList, <Users className="w-4 h-4 text-blue-300" />, 'Members List')}
              {menuItem(onAddMember, <UserPlus className="w-4 h-4 text-blue-300" />, 'Add New Member')}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="mb-1">
          <button
            onClick={() => toggle('payments')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Payments</span>
            </div>
            {expanded === 'payments' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded === 'payments' && (
            <div className="pl-4 pb-2 space-y-1">
              {menuItem(onPaymentsList, <CreditCard className="w-4 h-4 text-blue-300" />, 'Payments List')}
            </div>
          )}
        </div>

        {/* Users */}
        <div className="mb-1">
          <button
            onClick={() => toggle('users')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Users</span>
            </div>
            {expanded === 'users' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded === 'users' && (
            <div className="pl-4 pb-2 space-y-1">
              {menuItem(onUsersList, <Users className="w-4 h-4 text-blue-300" />, 'Users List')}
              {menuItem(onAddUser, <UserPlus className="w-4 h-4 text-blue-300" />, 'Add User')}
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="mb-1">
          <button
            onClick={() => toggle('reports')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Reports</span>
            </div>
            {expanded === 'reports' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded === 'reports' && (
            <div className="pl-4 pb-2 space-y-1">
              {menuItem(onPaymentsReport, <CreditCard className="w-4 h-4 text-blue-300" />, 'Payments Report')}
              {menuItem(onExpenseReport, <Receipt className="w-4 h-4 text-blue-300" />, 'Expense Report')}
              {menuItem(onIncomeStatement, <BarChart3 className="w-4 h-4 text-blue-300" />, 'Income Statement')}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="mb-1">
          <button
            onClick={() => toggle('expenses')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Expenses</span>
            </div>
            {expanded === 'expenses' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded === 'expenses' && (
            <div className="pl-4 pb-2 space-y-1">
              {menuItem(onAddExpense, <Receipt className="w-4 h-4 text-blue-300" />, 'Add Expense')}
              {menuItem(onExpensesList, <Receipt className="w-4 h-4 text-blue-300" />, 'Expenses List')}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-white/5 transition-colors mb-2"
        >
          <Settings className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
