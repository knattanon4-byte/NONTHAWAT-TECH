'use client';
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GlassCard } from '@/components/ui/GlassCard';
import { generateQuotationPDF } from '@/utils/pdfExport';
import { supabase } from '@/lib/supabase/client'; // 🛰️ ต่อท่อตรงเชื่อมโยงมิติข้อมูลหลัก
import { Plus, Trash2, FileDown, History, RefreshCw, Layers } from 'lucide-react';

const quotationSchema = z.object({
  customerName: z.string().min(1, 'Please select a valid target entity node'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  items: z.array(z.object({
    description: z.string().min(1, 'Profile description required'),
    quantity: z.number().min(1, 'Minimum allocation is 1 unit'),
    unit_price: z.number().min(0, 'Fee cannot be negative')
  }))
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface LocalSavedQuotation {
  id: string;
  timestamp: string;
  customerName: string;
  total: number;
  items: any[];
  discount: number;
}

export default function QuotationPage() {
  const [history, setHistory] = useState<LocalSavedQuotation[]>([]);
  const [targetNodes, setTargetNodes] = useState<any[]>([]); // รองรับโครงสร้างยืดหยุ่นสูงจากฐานข้อมูล

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerName: '',
      discount: 0,
      items: [{ description: 'Core Cluster Node Bandwidth Allocation', quantity: 1, unit_price: 1500 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // 🔄 ซิงค์ประวัติโลคอล และดึงรายชื่อลูกค้าที่ระบบจ่ายเงินผ่าน ACTIVE จาก Supabase
  useEffect(() => {
    const savedHistory = localStorage.getItem('matrix_core_quote_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const fetchTargetNodes = async () => {
      try {
        const { data, error } = await supabase
          .from('target_nodes')
          .select('*')
          .eq('status', 'ACTIVE'); // 🔒 ด่านกักกัน: สอยเฉพาะโหนดลูกค้าสถานะจ่ายเงิน ACTIVE เท่านั้น ตัวระงับดับอนาคตหมดสิทธิ์โผล่

        if (error) throw error;

        if (data && data.length > 0) {
          setTargetNodes(data);
        } else {
          loadLocalCustomersFallback();
        }
      } catch (err) {
        console.warn('⚡ Quotation Cluster: Falling back to local ledger backup.');
        loadLocalCustomersFallback();
      }
    };

    const loadLocalCustomersFallback = () => {
      const savedCustomers = localStorage.getItem('matrix_core_customer_ledger');
      if (savedCustomers) {
        setTargetNodes(JSON.parse(savedCustomers));
      } else {
        setTargetNodes([
          { id: '1', node_name: 'ANANYATA CHIVATO NODE', corporate_code: 'ANC-01' }
        ]);
      }
    };

    fetchTargetNodes();
  }, []);

  const watchedItems = watch('items') || [];
  const watchedDiscount = watch('discount') || 0;

  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unit_price) || 0;
    return sum + (qty * price);
  }, 0);

  const vat = (subtotal - watchedDiscount) * 0.07;
  const total = Math.max((subtotal - watchedDiscount) + vat, 0);

  const onSubmit = (data: QuotationFormValues) => {
    generateQuotationPDF(data.customerName, data.items as any, {
      subtotal,
      discount: watchedDiscount,
      vat,
      total
    });

    const newRecord: LocalSavedQuotation = {
      id: `QT-${Date.now()}`,
      timestamp: new Date().toLocaleString('th-TH'),
      customerName: data.customerName,
      total: total,
      items: data.items,
      discount: watchedDiscount
    };

    const updatedHistory = [newRecord, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('matrix_core_quote_history', JSON.stringify(updatedHistory));
  };

  const downloadAgain = (quote: LocalSavedQuotation) => {
    const s = quote.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const v = (s - quote.discount) * 0.07;
    generateQuotationPDF(quote.customerName, quote.items, {
      subtotal: s,
      discount: quote.discount,
      vat: v,
      total: quote.total
    });
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('matrix_core_quote_history', JSON.stringify(updated));
  };

  return (
    <div className="space-y-8 transform-gpu max-w-4xl pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Quantum Quotation Manifest</h2>
        <p className="text-xs text-slate-400">Mint financial balance contracts and safely export core encrypted documents.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 🔄 คอมโพเนนต์ Dropdown ดึงสัญญาณสดจาก Secure Cloud Cluster */}
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Target Node Identity</label>
              <select 
                {...register('customerName')}
                className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/40 transition-colors cursor-pointer appearance-none"
              >
                <option value="" className="text-slate-500">Select authenticated entity node...</option>
                {targetNodes.map((node) => {
                  // 🛡️ คัดกรองตัวแปรแบบเหนียวแน่น ป้องกันตับแล่บพังจากชื่อฟิลด์ฐานข้อมูลสลับกับโลคอล
                  const currentName = node.node_name || node.nodeName || 'Unknown Node';
                  const currentCode = node.corporate_code || node.corporateCode || 'N/A';
                  
                  return (
                    <option key={node.id} value={currentName} className="bg-slate-950 text-slate-200">
                      {currentName} ({currentCode})
                    </option>
                  );
                })}
              </select>
              {errors.customerName && <p className="text-[10px] text-rose-400 font-mono mt-1">{errors.customerName.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">System Discount (฿)</label>
              <input 
                type="number"
                autoComplete="off"
                {...register('discount', { valueAsNumber: true })}
                className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/40 font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">Allocation Resource Blocks</label>
            
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                <div className="flex-1 w-full">
                  <input 
                    {...register(`items.${index}.description` as const)}
                    autoComplete="off"
                    placeholder="Resource vector identifier..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none"
                  />
                </div>
                <div className="w-full sm:w-24">
                  <input 
                    type="number"
                    autoComplete="off"
                    {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                    placeholder="QTY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none font-mono"
                  />
                </div>
                <div className="w-full sm:w-36 flex gap-2 items-center">
                  <input 
                    type="number"
                    autoComplete="off"
                    {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })}
                    placeholder="Fee (฿)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none font-mono"
                  />
                  {fields.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button 
              type="button"
              onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
              className="text-xs text-cyan-400 font-mono flex items-center gap-1.5 hover:text-cyan-300 transition-colors pt-1"
            >
              <Plus size={14} /> Append Resource Element
            </button>
          </div>

          <div className="border-t border-slate-900/80 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs font-mono text-slate-400 space-y-1">
              <p>Subtotal Ledger: ฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p>Operational VAT Buffer (7%): ฿{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-sm font-bold text-white">Absolute Charge Sum: <span className="text-purple-400">฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto justify-end flex-1">
              <button 
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 rounded-xl text-black font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 transform-gpu"
              >
                <FileDown size={14} /> Transpile Encrypted PDF
              </button>
            </div>
          </div>
        </GlassCard>
      </form>

      {/* แผงควบคุมประวัติการออกเอกสาร */}
      <GlassCard className="p-6 space-y-4 border border-slate-800/60">
        <div className="flex items-center gap-2 text-slate-200 font-medium text-sm">
          <Layers size={16} className="text-cyan-400" />
          <span>Core Interface Local Ledger History</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono italic">No recent configuration profiles committed to local memory.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-900">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Target Node Identity</th>
                  <th className="p-3 text-right">Absolute Sum</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                {history.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-slate-400 text-[11px]">{quote.timestamp}</td>
                    <td className="p-3 font-sans font-medium text-white">{quote.customerName}</td>
                    <td className="p-3 text-right text-cyan-400 font-bold">฿{quote.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 flex items-center justify-center gap-3">
                      <button 
                        onClick={() => downloadAgain(quote)}
                        className="text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw size={12} /> Re-PDF
                      </button>
                      <button 
                        onClick={() => deleteHistory(quote.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}