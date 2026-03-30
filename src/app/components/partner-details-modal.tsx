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
    material_name2?: string;
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{partnerName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {type === 'stock' ? 'Inventory Details' : 'Loan Details'}
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
          <div className="border-b border-slate-200 bg-slate-50 flex">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 px-3 py-2.5 text-center text-xs font-medium transition-all border-b-2 ${
                activeTab === 'incoming'
                  ? 'border-slate-900 text-slate-900 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Lending Out
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 px-3 py-2.5 text-center text-xs font-medium transition-all border-b-2 ${
                activeTab === 'outgoing'
                  ? 'border-slate-900 text-slate-900 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Borrowing In
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : filteredData && Array.isArray(filteredData) && filteredData.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredData.map((item: any, idx: number) => {
                if (type === 'stock') {
                  const stockItem = item as StockItem;
                  return (
                    <div 
                      key={stockItem.materialDescription || idx} 
                      className="bg-white border border-slate-100 rounded-md p-3 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-xs truncate">
                            {stockItem.materialDescription}
                          </h4>
                          {stockItem.material_name2 && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {stockItem.material_name2}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">Quantity</p>
                            <p className="text-sm font-semibold text-slate-900">{stockItem.physicalQty}</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">Balance</p>
                            <p className={`text-sm font-semibold ${stockItem.netOwned! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {stockItem.netOwned! > 0 ? "+" : ""}{stockItem.netOwned}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const loanItem = item as LoanItem;
                  const partnerInfo = activeTab === 'incoming' ? loanItem.borrower?.business_partner_name : loanItem.lender?.business_partner_name;
                  
                  return (
                    <div 
                      key={loanItem.business_partner_empties_loan_key || idx} 
                      className="bg-white border border-slate-100 rounded-md p-3 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-xs truncate">
                            {loanItem.material?.material_description || 'Unknown'}
                          </h4>
                          {loanItem.material?.material_name2 && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              SKU: {loanItem.material.material_name2}
                            </p>
                          )}
                          {partnerInfo && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {activeTab === 'incoming' ? 'To: ' : 'From: '} <span className="text-slate-600 font-medium">{partnerInfo}</span>
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <p className="text-[10px] text-slate-500">Qty</p>
                            <p className="text-sm font-semibold text-slate-900">{loanItem.bp_loan_qty_in_base_uom}</p>
                          </div>
                          
                          <div>
                            <p className="text-[10px] text-slate-500">Status</p>
                            <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              loanItem.bp_loan_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              loanItem.bp_loan_status === 'open' || loanItem.bp_loan_status === 'active' ? 'bg-blue-100 text-blue-700' :
                              loanItem.bp_loan_status === 'closed' ? 'bg-green-100 text-green-700' :
                              loanItem.bp_loan_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              loanItem.bp_loan_status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {loanItem.bp_loan_status.charAt(0).toUpperCase() + loanItem.bp_loan_status.slice(1)}
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
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">
                {type === 'loans' ? `No ${activeTab === 'incoming' ? 'lending out' : 'borrowing in'} transactions` : 'No data available'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailsModal;
