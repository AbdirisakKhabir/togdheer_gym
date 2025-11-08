'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Customer } from '@/types/customer';
import CustomerCard from '@/components/CustomerCard';
import CustomerDetailModal from '@/components/CustomerDetailModal';
import Swal from 'sweetalert2';
import AddUserModal from '@/components/AddUserModal';
import UsersListModal from '@/components/UsersListModal';
import { Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import PaymentsListModal from '@/components/PaymentsListModal';
import PaymentsReportModal from '@/components/PaymentsReportModal';
import { Search, Plus, RefreshCw, MessageCircle } from "lucide-react";
import RenewalModal from '@/components/RenewalModal';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { CreditCard, BarChart3, LogOut, UserPlus, ChevronRight, ChevronLeft } from 'lucide-react';
import CustomerModal from '@/components/AddCustomerModal';

// Payment types
interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

// Report types
interface ReportFilters {
  startDate: string;
  endDate: string;
  phone: string;
  name: string;
}

// Auth Wrapper Component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });
  const [activeStat, setActiveStat] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '200',
        ...filters
      });

      const response = await fetch(`/api/customers?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setPagination(data.pagination);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('🚨 Error fetching customers:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Customers',
        text: error instanceof Error ? error.message : 'An unexpected error occurred while fetching customers.',
        timer: 4000,
        showConfirmButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatClick = useCallback(async (statType: string) => {
    try {
      // If clicking the same stat again, reset to show all
      if (activeStat === statType) {
        setActiveStat(null);
        const filters = {};
        await fetchCustomers(1, filters);
        return;
      }

      setActiveStat(statType);
      
      // Fetch customers for the specific stat type
      const response = await fetch(`/api/customers?type=${statType}&page=1&limit=150`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setPagination(data.pagination);
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: `${statType.charAt(0).toUpperCase() + statType.slice(1)} Members`,
          text: `Showing ${data.pagination?.totalCount} ${statType} members`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error('Failed to fetch stat data');
      }
    } catch (error) {
      console.error('Error fetching stat data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load member data',
        timer: 3000,
      });
    }
  }, [activeStat, fetchCustomers]);

  const resetStatFilter = useCallback(() => {
    setActiveStat(null);
    const filters = {};
    fetchCustomers(1, filters);
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    pagination,
    activeStat,
    fetchCustomers,
    setCustomers,
    handleStatClick, // Make sure this is returned
    resetStatFilter,
    setActiveStat,
    setPagination
  };
}

// Custom hook for filters
function useCustomerFilters() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  const handleFilterChange = useCallback((filter: string) => {
    setSelectedFilter(filter);
  }, []);

  const handleGenderFilter = useCallback((gender: string) => {
    setGenderFilter(gender);
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const getApiFilters = useCallback(() => {
    const filters: Record<string, string> = {};
    
    if (searchTerm) filters.search = searchTerm;
    if (genderFilter !== 'all') filters.gender = genderFilter;
    
    // Handle date filters
    if (selectedFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      
      switch (selectedFilter) {
        case 'today':
          filters.expireDate = today;
          break;
        case 'tomorrow':
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          filters.expireDate = tomorrow.toISOString().split('T')[0];
          break;
        case 'expired':
          filters.status = 'expired';
          break;
        default:
          filters.status = selectedFilter;
      }
    }
    
    return filters;
  }, [selectedFilter, searchTerm, genderFilter]);

  return {
    selectedFilter,
    searchTerm,
    genderFilter,
    handleFilterChange,
    handleGenderFilter,
    handleSearch,
    getApiFilters
  };
}

export default function CustomersPage() {
  // State Management
  const { customers, loading, pagination, fetchCustomers, setCustomers, handleStatClick,  } = useCustomers();
  const {
    selectedFilter,
    searchTerm,
    genderFilter,
    handleFilterChange,
    handleGenderFilter,
    handleSearch,
    getApiFilters
  } = useCustomerFilters();
  
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isUsersListModalOpen, setIsUsersListModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isPaymentsListModalOpen, setIsPaymentsListModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isPaymentsReportModalOpen, setIsPaymentsReportModalOpen] = useState(false);
  const [isCustomersReportModalOpen, setIsCustomersReportModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  // Add this state to track which stat is active
  const [activeStat, setActiveStat] = useState<string | null>(null);
  // Add this state to track which stat is activ



  const router = useRouter();
  const { data: session } = useSession();

  // Effects
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const filters = getApiFilters();
    fetchCustomers(currentPage, filters);
  }, [fetchCustomers, currentPage, getApiFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchTerm, genderFilter]);

  // Customer management functions
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };


  
  const handleUpdateCustomer = async (customerId: string, updatedData: Partial<Customer>) => {
    try {
      // Refresh data to get updated customer from server
      const filters = getApiFilters();
      fetchCustomers(currentPage, filters);
      
      // If the edited customer is currently selected in detail modal, update it
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(prev => prev ? { ...prev, ...updatedData } : null);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleAddCustomer = (newCustomer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const customer: Customer = {
      ...newCustomer,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setCustomers(prev => [...prev, customer]);
    // Refresh data to include the new customer
    const filters = getApiFilters();
    fetchCustomers(currentPage, filters);
    
    Swal.fire({
      icon: 'success',
      title: 'Customer Added!',
      text: `${newCustomer.name} has been successfully added.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Selection functions
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  // Pagination
  const paginate = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
  }, []);

  // Renewal function
  const handleRenewal = async (renewalData: {
    customerIds: string[];
    paidAmounts: { [key: string]: number };
    expireDates: { [key: string]: string };
  }) => {
    try {
      const renewalPromises = renewalData.customerIds.map(async (customerId) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return null;

        try {
          const renewResponse = await fetch(`/api/customer/${customerId}/renew`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              expireDate: renewalData.expireDates[customerId],
              paidAmount: renewalData.paidAmounts[customerId],
              userId: session?.user?.id || 1,
            }),
          });

          if (!renewResponse.ok) {
            const errorData = await renewResponse.json();
            throw new Error(errorData.error || 'Failed to renew customer');
          }

          const result = await renewResponse.json();

          // Send renewal WhatsApp message if phone exists
          if (customer.phone) {
            try {
              await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phone: customer.phone,
                  name: customer.name,
                  gender: customer.gender,
                  fee: renewalData.paidAmounts[customerId],
                  registerDate: new Date().toISOString().split('T')[0],
                  expireDate: renewalData.expireDates[customerId],
                  messageType: 'renewal'
                }),
              });
            } catch (whatsappError) {
              console.error(`Failed to send renewal message to ${customer.name}:`, whatsappError);
            }
          }

          return result.customer;
        } catch (error) {
          console.error(`Error renewing customer ${customer.name}:`, error);
          throw error;
        }
      });

      const renewalResults = await Promise.allSettled(renewalPromises);
      
      const failedRenewals = renewalResults.filter(result => result.status === 'rejected');
      
      if (failedRenewals.length > 0) {
        throw new Error(`${failedRenewals.length} customer(s) failed to renew`);
      }

      // Refresh data after renewal
      const filters = getApiFilters();
      fetchCustomers(currentPage, filters);
      setSelectedCustomers([]);

      Swal.fire({
        icon: 'success',
        title: 'Renewal Successful!',
        html: `
          <div class="text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p class="text-lg font-semibold text-gray-800">${renewalData.customerIds.length} customer(s) renewed!</p>
            <p class="text-gray-600 mt-2">Memberships have been extended successfully.</p>
          </div>
        `,
        confirmButtonText: 'Great!',
        confirmButtonColor: '#10b981',
        timer: 5000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error during renewal:', error);
      Swal.fire({
        icon: 'error',
        title: 'Renewal Failed',
        text: error instanceof Error ? error.message : 'Failed to process renewal. Please try again.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // WhatsApp messaging
  const handleWhatsAppMessage = async () => {
    if (selectedCustomers.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Customers Selected',
        text: 'Please select at least one customer to send WhatsApp message.',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Send Payment Reminders?',
      html: `
        <div class="text-left">
          <p>You are about to send payment reminder messages to <strong>${selectedCustomers.length}</strong> customer(s).</p>
          <div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p class="text-sm text-yellow-800 font-semibold">Selected Customers:</p>
            <ul class="text-sm text-yellow-700 mt-2 max-h-32 overflow-y-auto">
              ${customers
                .filter(c => selectedCustomers.includes(c.id))
                .map(customer => `<li>• ${customer.name} (${customer.phone || 'No phone'})</li>`)
                .join('')}
            </ul>
          </div>
          <p class="mt-3 text-sm text-gray-600">Do you want to proceed?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Send Messages',
      cancelButtonText: 'No, Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const selectedCustomersData = customers.filter(c => selectedCustomers.includes(c.id));
        let successCount = 0;
        let failCount = 0;

        Swal.fire({
          title: 'Sending Messages...',
          html: `
            <div class="text-center">
              <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Sending payment reminders to ${selectedCustomers.length} customer(s)...</p>
              <p class="text-sm text-gray-500 mt-2">Please wait</p>
            </div>
          `,
          showConfirmButton: false,
          allowOutsideClick: false
        });

        const messagePromises = selectedCustomersData.map(async (customer) => {
          try {
            const response = await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: customer.phone,
                name: customer.name,
                gender: customer.gender,
                fee: customer.fee,
                registerDate: new Date().toISOString().split('T')[0],
                messageType: 'payment'
              }),
            });

            const result = await response.json();
            
            if (result.success) {
              successCount++;
              return { success: true, customer: customer.name };
            } else {
              failCount++;
              return { success: false, customer: customer.name, error: result.error };
            }
          } catch (whatsappError) {
            failCount++;
            return { success: false, customer: customer.name, error: whatsappError };
          }
        });

        await Promise.allSettled(messagePromises);
        Swal.close();

        if (failCount === 0) {
          Swal.fire({
            icon: 'success',
            title: 'Messages Sent Successfully!',
            html: `
              <div class="text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p class="text-lg font-semibold text-gray-800">All messages sent successfully!</p>
                <p class="text-gray-600 mt-2">Payment reminders sent to <strong>${successCount}</strong> customer(s).</p>
              </div>
            `,
            confirmButtonText: 'Great!',
            confirmButtonColor: '#10b981',
            timer: 5000,
            timerProgressBar: true,
          });
        } else if (successCount > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Partial Success',
            html: `
              <div class="text-left">
                <p><strong>${successCount}</strong> message(s) sent successfully</p>
                <p><strong>${failCount}</strong> message(s) failed to send</p>
                <div class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p class="text-sm text-yellow-800">Some customers may not have received the payment reminder.</p>
                </div>
              </div>
            `,
            confirmButtonText: 'Understand',
            confirmButtonColor: '#f59e0b',
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed to Send Messages',
            text: 'All payment reminder messages failed to send. Please try again later.',
            confirmButtonText: 'Try Again',
            confirmButtonColor: '#ef4444',
          });
        }
      } catch (error) {
        console.error('Error sending WhatsApp messages:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An unexpected error occurred while sending messages.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444',
        });
      }
    }
  };

  // Logout function
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout Confirmation',
      text: 'Are you sure you want to logout from Libaax Fitness?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Logging out...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        await signOut({ redirect: false });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        Swal.close();
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Logout Failed',
          text: 'Failed to logout. Please try again.',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  // User management
  const handleAddUser = (userData: any) => {
    setUsers(prev => [...prev, userData]);
    setIsAddUserModalOpen(false);
  };

  // Report functions
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    phone: '',
    name: ''
  });

  const handleReportFilterChange = (key: keyof ReportFilters, value: string) => {
    setReportFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateReport = (type: 'payments' | 'customers') => {
    console.log(`Generating ${type} report with filters:`, reportFilters);
    Swal.fire({
      icon: 'info',
      title: 'Report Generation',
      text: `${type} report generation feature will be implemented soon.`,
      timer: 3000,
      showConfirmButton: false,
    });
  };

  const handleAddPayment = (paymentData: any) => {
    console.log('Adding payment:', paymentData);
    setIsAddPaymentModalOpen(false);
  };

  // Helper functions
  const getDayName = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDateString = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    return date.toISOString().split('T')[0];
  };

  // Button style helpers
  const getActiveButtonClasses = (color: string) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
      red: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
      orange: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25',
      indigo: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25',
      pink: 'bg-pink-500 text-white shadow-lg shadow-pink-500/25',
      gray: 'bg-gray-500 text-white shadow-lg shadow-gray-500/25',
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };

  const getInactiveButtonClasses = (color: string) => {
    const colorClasses = {
      blue: 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300 hover:bg-blue-50 shadow-sm',
      red: 'bg-white text-gray-700 border border-gray-300 hover:border-red-300 hover:bg-red-50 shadow-sm',
      orange: 'bg-white text-gray-700 border border-gray-300 hover:border-orange-300 hover:bg-orange-50 shadow-sm',
      indigo: 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm',
      pink: 'bg-white text-gray-700 border border-gray-300 hover:border-pink-300 hover:bg-pink-50 shadow-sm',
      gray: 'bg-white text-gray-700 border border-gray-300 hover:border-gray-300 hover:bg-gray-50 shadow-sm',
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };



  
const stats = useMemo(() => {
  if (!isClient) return { active: 0, notExpired: 0, expired: 0, expiringThisWeek: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  // Active members: isActive = true AND expireDate >= today
  const active = customers.filter(c => 
    c.isActive && c.expireDate && new Date(c.expireDate) >= today
  ).length;
  
  // Not expired members: expireDate >= today (regardless of isActive status)
  const notExpired = customers.filter(c => 
    c.expireDate && new Date(c.expireDate) >= today
  ).length;
  
  // Expired members: expireDate < today OR no expireDate
  const expired = customers.filter(c => 
    !c.expireDate || new Date(c.expireDate) < today
  ).length;
  
  // Expiring this week: expireDate between today and next week
  const expiringThisWeek = customers.filter(c => 
    c.expireDate && 
    new Date(c.expireDate) >= today && 
    new Date(c.expireDate) <= nextWeek
  ).length;

  return { active, notExpired, expired, expiringThisWeek };
}, [customers, isClient]);






  // Loading state
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-12"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-24 shadow-sm"></div>
              ))}
            </div>
            
            <div className="bg-white rounded-2xl p-8 mb-8 h-40 shadow-sm"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-8 flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-gray-700 font-semibold">Loading customers...</span>
              </div>
            </div>
          )}

          {/* Header with Navigation Dropdowns */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
            <div className="flex items-center mb-4 md:mb-0">
              <img
                src='./logo.jpg'
                alt="Company Logo"
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg mr-4"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Libaax Fitness</h1>
                <p className="text-gray-600 mt-1">Membership Management System</p>
                {session?.user && (
                  <p className="text-sm text-gray-500">
                    Welcome, {session.user.name || session.user.email?.split('@')[0] || 'User'}
                  </p>
                )}
              </div>
            </div>
            
            {/* Navigation Dropdowns */}
            <div className="flex flex-wrap gap-3">
              {/* Payments Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'payments' ? null : 'payments')}
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Payments</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'payments' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white text-black rounded-xl shadow-lg border border-gray-200 z-10 animate-in fade-in-0 zoom-in-95">
                    <button
                      onClick={() => {
                        setIsPaymentsListModalOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-t-xl transition-colors duration-200 border-b border-gray-100 flex items-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Payments List</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Users Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'users' ? null : 'users')}
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:border-green-300 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'users' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white text-black rounded-xl shadow-lg border border-gray-200 z-10 animate-in fade-in-0 zoom-in-95">
                    <button
                      onClick={() => {
                        setIsUsersListModalOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 rounded-t-xl duration-200 border-b border-gray-100 flex items-center space-x-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Users List</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddUserModalOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 rounded-b-xl transition-colors duration-200 flex items-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add User</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Reports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'reports' ? null : 'reports')}
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:border-purple-300 flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Reports</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'reports' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white text-black rounded-xl shadow-lg border border-gray-200 z-10 animate-in fade-in-0 zoom-in-95">
                    <button
                      onClick={() => {
                        setIsPaymentsReportModalOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-t-xl transition-colors duration-200 border-b border-gray-100 flex items-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Payments Report</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Member Button */}
              <div className="relative">
                <button
                 onClick={() => setIsCustomerModalOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 
                            hover:from-blue-600 hover:to-blue-700 text-white 
                            px-8 py-4 rounded-xl font-bold transition-all duration-200 
                            shadow-lg shadow-blue-500/25 flex items-center space-x-2 
                            transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Member</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="relative">
                <button
                  onClick={handleLogout}
                  className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-300 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div 
    className={`bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
      activeStat === 'active' ? 'ring-4 ring-green-300 ring-opacity-50' : ''
    }`}
    onClick={() => handleStatClick('active')}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-green-100 text-sm font-medium">Active Members</p>
        <p className="text-3xl font-bold mt-2">{stats.active}</p>
      </div>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        <CheckCircle className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
  
  <div 
    className={`bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
      activeStat === 'notExpired' ? 'ring-4 ring-blue-300 ring-opacity-50' : ''
    }`}
    onClick={() => handleStatClick('notExpired')}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-blue-100 text-sm font-medium">Not Expired</p>
        <p className="text-3xl font-bold mt-2">{stats.notExpired}</p>
      </div>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        <Users className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
  
  <div 
    className={`bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
      activeStat === 'expired' ? 'ring-4 ring-red-300 ring-opacity-50' : ''
    }`}
    onClick={() => handleStatClick('expired')}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-red-100 text-sm font-medium">Expired</p>
        <p className="text-3xl font-bold mt-2">{stats.expired}</p>
      </div>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        <Clock className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
  
  <div 
    className={`bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
      activeStat === 'expiring' ? 'ring-4 ring-orange-300 ring-opacity-50' : ''
    }`}
    onClick={() => handleStatClick('expiring')}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-orange-100 text-sm font-medium">Expiring Soon</p>
        <p className="text-3xl font-bold mt-2">{stats.expiringThisWeek}</p>
      </div>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-8 mb-8 border border-gray-200 transition-all duration-300 hover:shadow-xl">
            {/* Top Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            bg-white shadow-sm text-gray-900 placeholder-gray-500 
                            transition-all duration-200 hover:shadow-md"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-3 justify-start lg:justify-end">
                {[
                  { label: "All Members", key: "all", color: "blue" as const },
                  { label: `Today (${getDayName(0)})`, key: "today", color: "red" as const },
                  { label: `Tomorrow (${getDayName(1)})`, key: "tomorrow", color: "orange" as const },
                  { label: "Expired", key: "expired", color: "red" as const },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => handleFilterChange(btn.key)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedFilter === btn.key
                        ? getActiveButtonClasses(btn.color)
                        : getInactiveButtonClasses(btn.color)
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}

                {/* Gender Filters */}
                {[
                  { label: "Male", key: "male", color: "indigo" as const },
                  { label: "Female", key: "female", color: "pink" as const },
                  { label: "All Genders", key: "all", color: "gray" as const },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => handleGenderFilter(btn.key)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      genderFilter === btn.key
                        ? getActiveButtonClasses(btn.color)
                        : getInactiveButtonClasses(btn.color)
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-gray-200">
              {selectedCustomers.length > 0 && (
                <>
                  {/* Renew Button */}
                  <button
                    onClick={() => setIsRenewalModalOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 
                              hover:from-green-600 hover:to-green-700 text-white 
                              px-6 py-4 rounded-xl font-bold transition-all duration-200 
                              shadow-lg shadow-green-500/25 flex items-center space-x-2 
                              transform hover:scale-105"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Renew Selected ({selectedCustomers.length})</span>
                  </button>

                  {/* WhatsApp Button */}
                  <button
                    onClick={handleWhatsAppMessage}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 
                              hover:from-emerald-600 hover:to-green-700 text-white 
                              px-6 py-4 rounded-xl font-bold transition-all duration-200 
                              shadow-lg shadow-green-500/25 flex items-center space-x-2 
                              transform hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Send Notification ({selectedCustomers.length})</span>
                  </button>
                </>
              )}
            </div>
          </div>
         
          {activeStat && (
            <div className="mb-6 flex justify-center">
              <button
                onClick={() => {
                  setActiveStat('active'); // Default to active
                  const filters = getApiFilters();
                  fetchCustomers(1, filters);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Show Active Members (Default)</span>
              </button>
            </div>
          )}


          {/* Select All Checkbox */}
          {customers.length > 0 && (
            <div className="mb-6 flex items-center bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={selectAllCustomers}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <label className="ml-3 text-gray-700 font-semibold">
                Select All ({selectedCustomers.length} selected of {customers.length})
              </label>
            </div>
          )}

          {/* Customer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeletons
              [...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-64 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              customers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  isSelected={selectedCustomers.includes(customer.id)}
                  onSelect={() => toggleCustomerSelection(customer.id)}
                  onClick={handleCustomerClick}
                />
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button
                onClick={() => paginate(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev || loading}
                className="flex items-center space-x-2 px-4 py-2 border text-black border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <div className="flex space-x-1">
                {(() => {
                  const pages = [];
                  const showPages = 3;
                  
                  // Always show first page
                  pages.push(
                    <button
                      key={1}
                      onClick={() => paginate(1)}
                      disabled={loading}
                      className={`w-10 h-10 rounded-lg font-semibold transition-colors duration-200 ${
                        pagination.currentPage === 1
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      1
                    </button>
                  );

                  // Show ellipsis if there's a gap
                  if (pagination.currentPage > showPages + 1) {
                    pages.push(
                      <span key="ellipsis1" className="w-10 h-10 flex items-center justify-center text-gray-500">
                        ...
                      </span>
                    );
                  }

                  // Show pages around current page
                  for (let i = Math.max(2, pagination.currentPage - 1); i <= Math.min(pagination.totalPages - 1, pagination.currentPage + 1); i++) {
                    if (i === 1 || i === pagination.totalPages) continue;
                    pages.push(
                      <button
                        key={i}
                        onClick={() => paginate(i)}
                        disabled={loading}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors duration-200 ${
                          pagination.currentPage === i
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Show ellipsis if there's a gap at the end
                  if (pagination.currentPage < pagination.totalPages - showPages) {
                    pages.push(
                      <span key="ellipsis2" className="w-10 h-10 flex items-center justify-center text-gray-500">
                        ...
                      </span>
                    );
                  }

                  // Always show last page if different from first
                  if (pagination.totalPages > 1) {
                    pages.push(
                      <button
                        key={pagination.totalPages}
                        onClick={() => paginate(pagination.totalPages)}
                        disabled={loading}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors duration-200 ${
                          pagination.currentPage === pagination.totalPages
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {pagination.totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>
              
              <button
                onClick={() => paginate(pagination.currentPage + 1)}
                disabled={!pagination.hasNext || loading}
                className="flex items-center space-x-2 text-black px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* No Results Message */}
          {!loading && customers.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="text-gray-400 text-8xl mb-6">💪</div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2">No members found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchTerm || selectedFilter !== 'all' || genderFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Get started by adding your first gym member'
                }
              </p>
            </div>
          )}

          {/* Modals */}
          <CustomerDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            customer={selectedCustomer}
            onEdit={handleEditCustomer}
          />

          <CustomerModal
            isOpen={isCustomerModalOpen}
            onClose={() => {
              setIsCustomerModalOpen(false);
              setEditingCustomer(null);
            }}
            onSave={handleAddCustomer}
            onUpdate={handleUpdateCustomer}
            customer={editingCustomer}
          />

          <RenewalModal
            isOpen={isRenewalModalOpen}
            onClose={() => setIsRenewalModalOpen(false)}
            onRenew={handleRenewal}
            selectedCount={selectedCustomers.length}
            selectedCustomers={customers.filter(c => selectedCustomers.includes(c.id))}
            currentUser={session?.user}
          />

          <PaymentsListModal
            isOpen={isPaymentsListModalOpen}
            onClose={() => setIsPaymentsListModalOpen(false)}
          />

          <PaymentsReportModal
            isOpen={isPaymentsReportModalOpen}
            onClose={() => setIsPaymentsReportModalOpen(false)}
          />

          <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            onAdd={handleAddUser}
          />

          <UsersListModal
            isOpen={isUsersListModalOpen}
            onClose={() => setIsUsersListModalOpen(false)}
          />

          {/* Add Payment Modal */}
          {isAddPaymentModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Add New Payment</h2>
                    <button
                      onClick={() => setIsAddPaymentModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddPayment({
                      customerId: formData.get('customerId') as string,
                      customerName: formData.get('customerName') as string,
                      amount: parseFloat(formData.get('amount') as string),
                      paymentDate: formData.get('paymentDate') as string,
                      paymentMethod: formData.get('paymentMethod') as string,
                      notes: formData.get('notes') as string
                    });
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                      <input
                        type="text"
                        name="customerName"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                      <input
                        type="date"
                        name="paymentDate"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                      <select
                        name="paymentMethod"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-gray-900"
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Mobile Payment">Mobile Payment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        name="notes"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-gray-900"
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsAddPaymentModalOpen(false)}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg"
                      >
                        Add Payment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Customers Report Modal */}
          {isCustomersReportModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Customers Report</h2>
                    <button
                      onClick={() => setIsCustomersReportModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={reportFilters.startDate}
                        onChange={(e) => handleReportFilterChange('startDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={reportFilters.endDate}
                        onChange={(e) => handleReportFilterChange('endDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                      <input
                        type="text"
                        value={reportFilters.name}
                        onChange={(e) => handleReportFilterChange('name', e.target.value)}
                        placeholder="Filter by name..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={reportFilters.phone}
                        onChange={(e) => handleReportFilterChange('phone', e.target.value)}
                        placeholder="Filter by phone..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button
                      onClick={() => setIsCustomersReportModalOpen(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => generateReport('customers')}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}