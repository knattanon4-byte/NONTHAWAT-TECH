'use client';
import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase/client';
import { Users, UserPlus, Trash2, Building, Activity, Search, ShieldCheck, RefreshCw, WifiOff, Wifi } from 'lucide-react';

interface CustomerNode {
  id: string;
  node_name?: string;
  nodeName?: string;
  corporate_code?: string;
  corporateCode?: string;
  sector: string;
  status: 'ACTIVE' | 'TERMINATED';
  joined_date?: string;
  joinedDate?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCloudLive, setIsCloudLive] = useState(true); 
  
  // Form State
  const [nodeName, setNodeName] = useState('');
  const [corporateCode, setCorporateCode] = useState('');
  const [sector, setSector] = useState('Enterprise Services');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('target_nodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomers(data as CustomerNode[]);
        setIsCloudLive(true);
        localStorage.setItem('matrix_core_customer_ledger', JSON.stringify(data));
      } else {
        loadLocalBackup();
      }
    } catch (cloudError) {
      console.warn('⚡ Matrix Network Node: Supabase restricted or offline. Deploying local backup cluster.');
      setIsCloudLive(false);
      loadLocalBackup();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalBackup = () => {
    const saved = localStorage.getItem('matrix_core_customer_ledger');
    if (saved) {
      setCustomers(JSON.parse(saved));
    } else {
      const defaultNodes: CustomerNode[] = [
        { id: 'NOD-1', node_name: 'Ananyata Chivato Node', corporate_code: 'ANC-01', sector: 'Financial Matrix', status: 'ACTIVE', joined_date: '28/5/2026' },
        { id: 'NOD-2', node_name: 'Srinakarin Sandbox Group', corporate_code: 'SRN-99', sector: 'Retail Operation', status: 'ACTIVE', joined_date: '20/5/2026' }
      ];
      setCustomers(defaultNodes);
      localStorage.setItem('matrix_core_customer_ledger', JSON.stringify(defaultNodes));
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 🔄 ฟังก์ชันสลับสถานะ Node (ACTIVE <-> TERMINATED) รองรับทั้ง Cloud และ Local
  const handleToggleNodeStatus = async (id: string, currentStatus: 'ACTIVE' | 'TERMINATED') => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE';
    
    try {
      if (isCloudLive) {
        const { error } = await supabase
          .from('target_nodes')
          .update({ status: nextStatus })
          .eq('id', id);
          
        if (error) throw error;
        fetchCustomers(); // โหลดข้อมูลใหม่จาก Supabase มาแสดงผล
      } else {
        // อัปเดตฝั่ง Local Storage กรณีออฟไลน์
        const updated = customers.map(c => c.id === id ? { ...c, status: nextStatus } : c);
        setCustomers(updated);
        localStorage.setItem('matrix_core_customer_ledger', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error toggling node status:', err);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim() || !corporateCode.trim()) return;

    const newNode: CustomerNode = {
      id: `NOD-${Date.now()}`,
      node_name: nodeName,
      corporate_code: corporateCode.toUpperCase(),
      sector,
      status: 'ACTIVE',
      joined_date: new Date().toLocaleDateString('th-TH')
    };

    try {
      if (isCloudLive) {
        const { error } = await supabase.from('target_nodes').insert([newNode]);
        if (error) throw error;
        fetchCustomers();
      } else {
        throw new Error('Local Mode');
      }
    } catch (err) {
      const currentLocal = localStorage.getItem('matrix_core_customer_ledger');
      const list = currentLocal ? JSON.parse(currentLocal) : [];
      const updated = [newNode, ...list];
      setCustomers(updated);
      localStorage.setItem('matrix_core_customer_ledger', JSON.stringify(updated));
    } finally {
      setNodeName('');
      setCorporateCode('');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      if (isCloudLive) {
        await supabase.from('target_nodes').delete().eq('id', id);
        fetchCustomers();
      } else {
        const updated = customers.filter(c => c.id !== id);
        setCustomers(updated);
        localStorage.setItem('matrix_core_customer_ledger', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Delete redirected to local node.');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const nameStr = c?.node_name || c?.nodeName || '';
    const codeStr = c?.corporate_code || c?.corporateCode || '';
    return nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           codeStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 transform-gpu max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="text-cyan-400" size={20} />
            Target Node Identity Ledger 
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 ${
              isCloudLive 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCloudLive ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isCloudLive ? 'SUPABASE ONLINE' : 'LOCAL SAFE MODE'}
            </span>
          </h2>
          <p className="text-xs text-slate-400">Dynamic network cluster mapping client identity parameters securely.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text"
            placeholder="Filter nodes by identity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <GlassCard className="p-5 border border-slate-800/40 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-mono uppercase tracking-wider border-b border-slate-900 pb-3">
            <UserPlus size={14} className="text-purple-400" />
            <span>Initialize Node Vector</span>
          </div>

          <form onSubmit={handleAddCustomer} className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider block">Node Entity Name</label>
              <input 
                type="text"
                autoComplete="off"
                placeholder="e.g., Alpha Core Corp..."
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-purple-500/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider block">Corporate Code Identifier</label>
              <input 
                type="text"
                autoComplete="off"
                placeholder="e.g., ACC-02..."
                value={corporateCode}
                onChange={(e) => setCorporateCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-purple-500/40 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider block">Operational Sector</label>
              <select 
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
              >
                <option value="Enterprise Services">Enterprise Services</option>
                <option value="Financial Matrix">Financial Matrix</option>
                <option value="Retail Operation">Retail Operation</option>
                <option value="Educational Cluster">Educational Cluster</option>
                <option value="Gaming Vector">Gaming Vector</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full mt-2 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 rounded-xl text-black font-semibold tracking-wide text-xs transition-all active:scale-95"
            >
              Commit Entity Node
            </button>
          </form>
        </GlassCard>

        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="p-4 border border-slate-800/60">
            {loading && customers.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-cyan-400" />
                <span>SYNCHRONIZING SECURE NETWORK LEDGER...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500 italic">
                No active entity nodes match the current filter query.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-950">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-900">
                      <th className="p-3">Node Identity</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredCustomers.map((node) => {
                      const currentName = node.node_name || node.nodeName || 'Unknown Name';
                      const currentCode = node.corporate_code || node.corporateCode || 'N/A';
                      
                      return (
                        <tr key={node.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 space-y-0.5">
                            <div className="font-sans font-medium text-white flex items-center gap-1.5">
                              <Building size={12} className="text-slate-400" />
                              {currentName}
                            </div>
                            <div className="text-[10px] text-slate-500">ID: {currentCode} | Mode: {isCloudLive ? 'Cloud Sync' : 'Local Verified'}</div>
                          </td>

                          <td className="p-3 text-slate-400 text-[11px] vertical-middle">
                            {node.sector}
                          </td>

                          <td className="p-3 text-center vertical-middle">
                            {/* 🎯 ปุ่มป้ายสถานะ คลิกเพื่อสลับเปิด-ปิดระบบ สไตล์ล้ำ ๆ และเปลี่ยนสีตามสถานะจริง */}
                            <button
                              onClick={() => handleToggleNodeStatus(node.id, node.status)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border cursor-pointer select-none transition-all active:scale-95 duration-150 ${
                                node.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              }`}
                            >
                              {node.status}
                            </button>
                          </td>

                          <td className="p-3 text-center vertical-middle">
                            <button 
                              onClick={() => handleDeleteCustomer(node.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <div className="flex gap-3 justify-end text-[10px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className={isCloudLive ? "text-emerald-500" : "text-amber-500"} /> 
              {isCloudLive ? 'Supabase Network Connection Secured' : 'Fault-Tolerant Local Storage Engaged'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}