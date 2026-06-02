'use client';
import React, { useState } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CustomerDetailsModal() {
const { selectedCustomerId, setSelectedCustomerId, customers, projects, updateCustomerNameInCloud } = useDashboardStore();
  const currentCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentProjects = currentCustomer ? projects[currentCustomer.id] || [] : [];
  const [editedName, setEditedName] = useState('');

  React.useEffect(() => {
    if (currentCustomer) setEditedName(currentCustomer.name);
  }, [currentCustomer]);

  if (!selectedCustomerId || !currentCustomer) return null;

  const chartData = currentProjects.map(p => ({ name: p.name, value: p.cost }));
  const COLORS = ['#22d3ee', '#a855f7', '#ec4899', '#3b82f6'];

const handleSave = () => {
  updateCustomerNameInCloud(currentCustomer.id, editedName);
  setSelectedCustomerId(null);
};
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background Overlay */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={() => setSelectedCustomerId(null)} 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transform-gpu" 
        />
        
        {/* Modal Body */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.96 }} 
          className="w-full max-w-2xl bg-slate-950/90 border border-slate-800 rounded-2xl p-6 relative z-10 space-y-6 shadow-[0_0_40px_rgba(168,85,247,0.1)] backdrop-blur-md transform-gpu will-change-transform"
        >
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <p className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Entity Core Manifest</p>
              <h3 className="text-lg font-bold text-white">{currentCustomer.name}</h3>
            </div>
            <button onClick={() => setSelectedCustomerId(null)} className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-500">Mutate Entity Alias</label>
                <div className="flex gap-2 mt-1.5">
                  <input 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 transition-colors" 
                  />
                  <button onClick={handleSave} className="px-3 bg-cyan-500 hover:bg-cyan-600 text-black rounded-lg flex items-center justify-center transition-colors active:scale-95 transform-gpu">
                    <Save size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase text-slate-500">Allocated Nodes & Telemetry Fees</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {currentProjects.map(p => (
                    <div key={p.id} className="p-2.5 border border-slate-900 bg-slate-900/20 rounded-lg flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-300">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        p.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>{p.payment_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recharts Pie Custom Graphics */}
            <div className="flex flex-col items-center justify-center border-l border-slate-900/60 pl-6">
              <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Cost Distribution Spectrum</p>
              <div className="w-full h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={42} outerRadius={55} paddingAngle={4} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#02040a" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}