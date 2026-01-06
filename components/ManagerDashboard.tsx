
import React, { useMemo, useState } from 'react';
import { ExpenseClaim, ExpenseType, ExpenseCategory, TimeDimension, UserRole } from '../types';

interface ManagerDashboardProps {
  claims: ExpenseClaim[];
  filteredClaims: ExpenseClaim[];
  timeDimension: TimeDimension;
  setTimeDimension: (d: TimeDimension) => void;
  selectedTimeValue: string;
  setSelectedTimeValue: (v: string) => void;
  selectedApplicant: string;
  setSelectedApplicant: (a: string) => void;
  onToggleReimbursed: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateClaim: (claim: ExpenseClaim) => void;
  onAddDirectPayment: (payment: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed' | 'category'> & { isReimbursed?: boolean }) => void;
  onAddIncome: (payment: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed' | 'category'>) => void;
  onAddFixedCost: (payment: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed' | 'category'>) => void;
  setCurrentRole: (role: UserRole) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ 
  claims, 
  filteredClaims,
  timeDimension, setTimeDimension,
  selectedTimeValue, setSelectedTimeValue,
  selectedApplicant, setSelectedApplicant,
  onToggleReimbursed, 
  onDelete, 
  onUpdateClaim,
  onAddDirectPayment,
  onAddIncome,
  onAddFixedCost,
  setCurrentRole
}) => {
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddFixed, setShowAddFixed] = useState(false);

  const [newPay, setNewPay] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    type: ExpenseType.OTHER,
    amount: '',
    vendor: '',
    description: '',
    remarks: ''
  });

  const openModal = (modalType: 'income' | 'salary' | 'payment' | 'fixed') => {
    const defaultDate = new Date().toLocaleDateString('en-CA');
    const reset = { date: defaultDate, amount: '', vendor: '', description: '', remarks: '' };
    if (modalType === 'income') {
      setNewPay({ ...reset, type: ExpenseType.SALES_INCOME });
      setShowAddIncome(true);
    } else if (modalType === 'salary') {
      setNewPay({ ...reset, type: ExpenseType.SALARY });
      setShowAddSalary(true);
    } else if (modalType === 'fixed') {
      setNewPay({ ...reset, type: ExpenseType.RENT });
      setShowAddFixed(true);
    } else {
      setNewPay({ ...reset, type: ExpenseType.OTHER });
      setShowAddPayment(true);
    }
  };

  const stats = useMemo(() => {
    let totalExpense = 0; 
    let totalIncome = 0;  
    let reimbTotal = 0;   
    let hrTotal = 0; 
    let fixedTotal = 0;
    let pending = 0;      
    let directOtherTotal = 0;  

    filteredClaims.forEach(c => {
      if (c.category === ExpenseCategory.INCOME) {
        totalIncome += c.amount;
      } else {
        totalExpense += c.amount;
        const isHR = [ExpenseType.SALARY, ExpenseType.SOCIAL_SECURITY].includes(c.type);

        if (isHR) {
          hrTotal += c.amount;
        } else if (c.category === ExpenseCategory.FIXED_COST) {
          fixedTotal += c.amount;
        } else if (c.category === ExpenseCategory.REIMBURSEMENT) {
          reimbTotal += c.amount;
        } else {
          directOtherTotal += c.amount;
        }
        
        if (!c.isReimbursed) pending += c.amount;
      }
    });

    return { 
      totalExpense, totalIncome, balance: totalIncome - totalExpense, 
      reimbTotal, hrTotal, fixedTotal, pending, 
      directTotal: directOtherTotal 
    };
  }, [filteredClaims]);

  const handleSubmit = (e: React.FormEvent, category: ExpenseCategory) => {
    e.preventDefault();
    const payload = {
      date: newPay.date,
      type: newPay.type,
      amount: parseFloat(newPay.amount),
      vendor: newPay.vendor,
      description: newPay.description,
      remarks: newPay.remarks,
      applicant: 'MANAGER',
      attachments: []
    };

    if (category === ExpenseCategory.INCOME) onAddIncome(payload);
    else if (category === ExpenseCategory.FIXED_COST) onAddFixedCost(payload);
    else onAddDirectPayment(payload);

    setShowAddIncome(false); setShowAddSalary(false); setShowAddPayment(false); setShowAddFixed(false);
    setNewPay({ date: new Date().toLocaleDateString('en-CA'), type: ExpenseType.OTHER, amount: '', vendor: '', description: '', remarks: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 核心指标看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">总营收收入</p>
          <p className="text-2xl font-black text-emerald-900">¥{stats.totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-900 shadow-sm scale-[1.02] ring-4 ring-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">总运营支出</p>
          <p className="text-2xl font-black text-slate-900">¥{stats.totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">本期净利润</p>
          <p className={`text-2xl font-black ${stats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>¥{stats.balance.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[32px] border-2 border-amber-100 shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">待结算/挂账</p>
          <p className="text-2xl font-black text-amber-900">¥{stats.pending.toLocaleString()}</p>
        </div>

        <div className="bg-indigo-50 p-6 rounded-[32px] border-2 border-indigo-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">人力成本</p>
          <p className="text-2xl font-black text-indigo-900">¥{stats.hrTotal.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-[32px] border-2 border-purple-100 shadow-sm">
          <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">固定成本支出</p>
          <p className="text-2xl font-black text-purple-900">¥{stats.fixedTotal.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[32px] border-2 border-rose-100 shadow-sm">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">其他公对公</p>
          <p className="text-2xl font-black text-rose-900">¥{stats.directTotal.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-[32px] border-2 border-blue-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">个人报销支出</p>
          <p className="text-2xl font-black text-blue-900">¥{stats.reimbTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* 操作与过滤 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex gap-2">
           <button onClick={() => openModal('income')} className="bg-emerald-600 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase transition-transform active:scale-95">录入收入</button>
           <button onClick={() => openModal('salary')} className="bg-indigo-600 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase transition-transform active:scale-95">薪资录入</button>
           <button onClick={() => openModal('fixed')} className="bg-purple-600 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase transition-transform active:scale-95">录入固定支出</button>
           <button onClick={() => openModal('payment')} className="bg-slate-900 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase transition-transform active:scale-95">单笔公对公</button>
        </div>
        <div className="flex items-center gap-3">
            <select value={timeDimension} onChange={(e) => setTimeDimension(e.target.value as any)} className="text-xs font-black border-none bg-slate-100 rounded-lg px-3 py-2 outline-none">
                <option value="month">按月统计</option><option value="quarter">按季统计</option><option value="year">按年统计</option><option value="all">显示全部</option>
            </select>
            {timeDimension !== 'all' && (
              <input 
                type={timeDimension === 'year' ? "number" : timeDimension === 'month' ? "month" : "text"} 
                value={selectedTimeValue}
                onChange={e => setSelectedTimeValue(e.target.value)}
                className="text-xs font-black border border-slate-200 rounded-lg px-3 py-2"
              />
            )}
        </div>
      </div>

      {/* 流水明细 */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">财务流水总表</h3>
          <select value={selectedApplicant} onChange={(e) => setSelectedApplicant(e.target.value)} className="text-[10px] font-black border border-slate-200 rounded-lg px-3 py-1 bg-white">
              <option value="all">所有提报人</option>
              {Array.from(new Set(claims.map(c => c.applicant))).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                <th className="px-8 py-4">分类/日期</th>
                <th className="px-8 py-4">相关方</th>
                <th className="px-8 py-4">描述摘要</th>
                <th className="px-8 py-4 text-right">金额</th>
                <th className="px-8 py-4 text-center">状态与操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {filteredClaims.length > 0 ? [...filteredClaims].sort((a,b) => b.createdAt - a.createdAt).map(claim => (
                <tr key={claim.id} className={`hover:bg-slate-50 transition-colors group ${claim.category === ExpenseCategory.FIXED_COST ? 'bg-purple-50/20' : ''}`}>
                  <td className="px-8 py-4">
                    <p className="font-black text-slate-900">{claim.type}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{claim.date}</p>
                  </td>
                  <td className="px-8 py-4">
                    <p className="font-black text-slate-700">{claim.vendor || claim.applicant}</p>
                  </td>
                  <td className="px-8 py-4 text-slate-500 max-w-xs truncate">
                    {claim.category === ExpenseCategory.FIXED_COST && <span className="mr-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] rounded uppercase font-black">固定</span>}
                    {claim.description}
                  </td>
                  <td className={`px-8 py-4 text-right font-black ${claim.category === ExpenseCategory.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {claim.category === ExpenseCategory.INCOME ? '+' : '-'}¥{claim.amount.toLocaleString()}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => onToggleReimbursed(claim.id)} className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black ${claim.isReimbursed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'} transition-all`}>
                          {claim.isReimbursed ? '已结清' : '标记结算'}
                      </button>
                      <button 
                        onClick={() => onDelete(claim.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-100 text-[9px] font-black uppercase tracking-wider"
                        title="立即删减该笔费用"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删减
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 text-xs font-black uppercase italic tracking-widest">暂无流水记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 快捷录入模态框 */}
      {(showAddIncome || showAddSalary || showAddPayment || showAddFixed) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">
                {showAddIncome ? '业务收入录入' : showAddSalary ? '薪资社保录入' : showAddFixed ? '固定成本录入' : '公对公支出录入'}
              </h3>
            </div>
            <form onSubmit={(e) => handleSubmit(e, showAddIncome ? ExpenseCategory.INCOME : showAddFixed ? ExpenseCategory.FIXED_COST : ExpenseCategory.DIRECT_PAYMENT)} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">日期</label>
                  <input type="date" required value={newPay.date} onChange={e => setNewPay({...newPay, date: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">项目分类</label>
                  <select value={newPay.type} onChange={e => setNewPay({...newPay, type: e.target.value as ExpenseType})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
                    {Object.values(ExpenseType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">金额 (元)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={newPay.amount} onChange={e => setNewPay({...newPay, amount: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-lg font-black" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{showAddIncome ? '付款方' : '收款/结算方'}</label>
                <input type="text" placeholder="公司或个人名称" value={newPay.vendor} onChange={e => setNewPay({...newPay, vendor: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">明细描述</label>
                <textarea required rows={2} value={newPay.description} onChange={e => setNewPay({...newPay, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddIncome(false); setShowAddSalary(false); setShowAddPayment(false); setShowAddFixed(false); }} className="flex-1 bg-slate-100 text-slate-400 font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest">取消</button>
                <button type="submit" className={`flex-1 ${showAddIncome ? 'bg-emerald-600' : showAddFixed ? 'bg-purple-600' : 'bg-slate-900'} text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest`}>确认录入</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
