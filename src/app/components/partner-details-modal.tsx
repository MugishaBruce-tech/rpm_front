import * as React from "react";
import { X } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { useState } from "react";

interface StockItem {
  materialDescription: string;
  material_name2?: string;
  physicalQty: number;
  lentQty: number;
  borrowedQty: number;
  netOwned?: number;
}

interface LoanItem {
  business_partner_empties_loan_key: number;
  material_key: number;
  business_partner_key: number;
  bp_loaned_to_business_partner_key: number;
  bp_loan_qty_in_base_uom: number;
  bp_loan_status: string;
  bp_loan_status_date_time: string;
  material?: {
    material_description: string;
    global_material_id?: string;
  };
  lender?: {
    business_partner_name: string;
  };
  borrower?: {
    business_partner_name: string;
  };
}

interface PartnerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: {
    id?: string;
    name?: string;
    region?: string;
    channel?: string;
  };
  data?: StockItem[] | LoanItem[];
  loading?: boolean;
  type?: "stock" | "loans";
  currentUserId?: number;
}

export const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  isOpen,
  onClose,
  partner = {},
  data = [],
  loading = false,
  type = "stock",
  currentUserId = 0,
}) => {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  if (!isOpen) return null;

  const partnerName = partner.name || "Partner";
  const partnerId = Number(partner.id) || 0;

  // For loans, categorize by partner's role (not filtered by current user)
  let filteredData = data;
  if (type === "loans" && Array.isArray(data) && partnerId) {
    const loans = data as LoanItem[];
    console.log('Categorizing loans for partner:', { partnerId, totalLoans: loans.length, activeTab });
    
    if (activeTab === "incoming") {
      // Incoming: loans where THIS PARTNER IS THE LENDER (money/goods coming in to their borrowers)
      filteredData = loans.filter((loan) => {
        const isPartnerLending = loan.business_partner_key === partnerId;
        return isPartnerLending;
      });
      console.log('Incoming (partner as lender):', filteredData.length, 'loans');
    } else {
      // Outgoing: loans where THIS PARTNER IS THE BORROWER (money/goods going out to their lenders)
      filteredData = loans.filter((loan) => {
        const isPartnerBorrowing = loan.bp_loaned_to_business_partner_key === partnerId;
        return isPartnerBorrowing;
      });
      console.log('Outgoing (partner as borrower):', filteredData.length, 'loans');
    }
  } else if (type === "loans" && Array.isArray(data) && !partnerId) {
    console.warn('partnerId not available for loan filtering:', { partnerId, dataLength: data?.length });
    filteredData = data || [];
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{partnerName}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {type === 'stock' ? 'Regional Inventory Details' : 'Regional Loan Details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs for Loans */}
        {type === 'loans' && (
          <div className="border-b border-slate-100 bg-white flex">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'incoming'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Lending Out
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'outgoing'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Borrowing In
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : filteredData && Array.isArray(filteredData) && filteredData.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredData.map((item: any, idx: number) => {
                if (type === 'stock') {
                  const stockItem = item as StockItem;
                  return (
                    <div 
                      key={stockItem.materialDescription || idx} 
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {stockItem.materialDescription}
                          </h4>
                          {stockItem.material_name2 && (
                            <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-500 rounded uppercase tracking-wider">
                              {stockItem.material_name2}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Qty</p>
                            <p className="text-sm font-black text-slate-900">{stockItem.physicalQty}</p>
                          </div>
                          
                          <div className="text-right border-l border-slate-100 pl-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Balance</p>
                            <p className={`text-sm font-black ${stockItem.netOwned! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {stockItem.netOwned! > 0 ? "+" : ""}{stockItem.netOwned}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const loanItem = item as LoanItem;
                  const statusColors: Record<string, string> = {
                    'pending': 'bg-yellow-50 text-yellow-600',
                    'open': 'bg-blue-50 text-blue-600',
                    'active': 'bg-blue-50 text-blue-600',
                    'closed': 'bg-green-50 text-green-600',
                    'cancelled': 'bg-red-50 text-red-600',
                    'overdue': 'bg-red-50 text-red-600',
                  };
                  
                  return (
                    <div 
                      key={loanItem.business_partner_empties_loan_key || idx} 
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {loanItem.material?.material_description || 'Unknown Material'}
                          </h4>
                          {loanItem.material?.global_material_id && (
                            <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-500 rounded uppercase tracking-wider">
                              {loanItem.material.global_material_id}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Qty</p>
                            <p className="text-sm font-black text-slate-900">{loanItem.bp_loan_qty_in_base_uom}</p>
                          </div>
                          
                          <div className="text-right border-l border-slate-100 pl-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status</p>
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${statusColors[loanItem.bp_loan_status] || 'bg-slate-50 text-slate-600'}`}>
                              {loanItem.bp_loan_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                <X className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                {type === 'loans' ? `No ${activeTab === 'incoming' ? 'lending out' : 'borrowing in'} transactions` : 'No data available'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailsModal;
