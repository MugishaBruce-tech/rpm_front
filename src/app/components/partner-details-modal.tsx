import * as React from "react";
import { X } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

interface StockItem {
  materialDescription: string;
  material_name2?: string;
  physicalQty: number;
  lentQty: number;
  borrowedQty: number;
  netOwned?: number;
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
  data?: StockItem[];
  loading?: boolean;
  type?: "stock" | "loans";
}

export const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  isOpen,
  onClose,
  partner = {},
  data = [],
  loading = false,
  type = "stock",
}) => {
  if (!isOpen) return null;

  const partnerName = partner.name || "Partner";

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : data && Array.isArray(data) && data.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {data.map((item: StockItem, idx: number) => (
                <div 
                  key={item.materialDescription || idx} 
                  className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">
                        {item.materialDescription}
                      </h4>
                      {item.material_name2 && (
                        <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-500 rounded uppercase tracking-wider">
                          {item.material_name2}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Qty</p>
                        <p className="text-sm font-black text-slate-900">{item.physicalQty}</p>
                      </div>
                      
                      <div className="text-right border-l border-slate-100 pl-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Balance</p>
                        <p className={`text-sm font-black ${item.netOwned >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {item.netOwned > 0 ? "+" : ""}{item.netOwned}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                <X className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                {data ? `No data available (${JSON.stringify(data)})` : "No data available"}
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
