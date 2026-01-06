
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, ExpenseClaim, ExpenseCategory, ExpenseType, TimeDimension } from './types';
import ExpenseForm from './components/ExpenseForm';
import ManagerDashboard from './components/ManagerDashboard';
import ReimbursementSummary from './components/ReimbursementSummary';

const App: React.FC = () => {
  const getLocalDefault = (dimension: TimeDimension) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    if (dimension === 'year') return `${y}`;
    if (dimension === 'quarter') return `${y}-Q${Math.ceil(parseInt(m) / 3)}`;
    if (dimension === 'month') return `${y}-${m}`;
    return "";
  };

  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('smart_expense_last_user') || '';
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  
  const [timeDimension, setTimeDimension] = useState<TimeDimension>('month');
  const [selectedTimeValue, setSelectedTimeValue] = useState<string>(getLocalDefault('month'));
  const [selectedApplicant, setSelectedApplicant] = useState<string>('all');

  useEffect(() => {
    if (timeDimension === 'all') return;
    const isYear = /^\d{4}$/.test(selectedTimeValue);
    const isMonth = /^\d{4}-\d{2}$/.test(selectedTimeValue);
    const isQuarter = /^\d{4}-Q[1-4]$/.test(selectedTimeValue);

    if (timeDimension === 'year' && !isYear) setSelectedTimeValue(getLocalDefault('year'));
    if (timeDimension === 'month' && !isMonth) setSelectedTimeValue(getLocalDefault('month'));
    if (timeDimension === 'quarter' && !isQuarter) setSelectedTimeValue(getLocalDefault('quarter'));
  }, [timeDimension]);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const savedClaims = localStorage.getItem('smart_expense_claims');
    if (savedClaims) {
      setClaims(JSON.parse(savedClaims));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_expense_claims', JSON.stringify(claims));
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const applicantMatch = selectedApplicant === 'all' || c.applicant === selectedApplicant;
      if (!applicantMatch) return false;
      if (timeDimension === 'all') return true;
      const parts = c.date.split(/[-/]/);
      if (parts.length < 2) return false;
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      if (timeDimension === 'year') return y === selectedTimeValue;
      if (timeDimension === 'quarter') {
        const q = Math.ceil(parseInt(m) / 3);
        return `${y}-Q${q}` === selectedTimeValue;
      }
      if (timeDimension === 'month') return `${y}-${m}` === selectedTimeValue;
      return true;
    });
  }, [claims, timeDimension, selectedTimeValue, selectedApplicant]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addClaim = (newClaim: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed' | 'category'> & { category?: ExpenseCategory, isReimbursed?: boolean }) => {
    const category = newClaim.category || ExpenseCategory.REIMBURSEMENT;
    const autoReimbursed = (category === ExpenseCategory.DIRECT_PAYMENT || category === ExpenseCategory.INCOME || category === ExpenseCategory.FIXED_COST);
    
    const claim: ExpenseClaim = {
      ...newClaim,
      category,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isReimbursed: newClaim.isReimbursed !== undefined ? newClaim.isReimbursed : autoReimbursed
    };
    
    if (claim.category === ExpenseCategory.REIMBURSEMENT) {
      setCurrentUser(newClaim.applicant);
      localStorage.setItem('smart_expense_last_user', newClaim.applicant);
    }
    
    setClaims(prev => [claim, ...prev]);
    showNotification('提交成功！', 'success');
  };

  const updateClaim = (updatedClaim: ExpenseClaim) => {
    setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
    showNotification('记录已更新', 'success');
  };

  const deleteClaim = (id: string) => {
    // 移除 confirm 弹窗以满足“点击即删除”的需求
    setClaims(prev => prev.filter(c => c.id !== id));
    showNotification('流水记录已删除', 'success');
  };

  const toggleReimbursed = (id: string) => {
    setClaims(prev => prev.map(c => 
      c.id === id ? { ...c, isReimbursed: !c.isReimbursed } : c
    ));
    showNotification('结算状态已更新', 'success');
  };

  return (
    <div className="min-h-screen pb-12">
      <nav className="bg-white border-b sticky top-0 z-[100]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg">M</div>
            <div className="hidden sm:block">
              <span className="text-xl font-black bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-600 bg-clip-text text-transparent">漫飞工作室</span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">Financial OS</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
            <button 
              onClick={() => setCurrentRole(UserRole.EMPLOYEE)} 
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${currentRole === UserRole.EMPLOYEE ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              人员报销
            </button>
            <button 
              onClick={() => setCurrentRole(UserRole.MANAGER)} 
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${currentRole === UserRole.MANAGER ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              收支看板
            </button>
            <button 
              onClick={() => setCurrentRole(UserRole.SUMMARY)} 
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${currentRole === UserRole.SUMMARY ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              报销汇总
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 mt-8">
        {notification && (
          <div className={`fixed top-24 right-6 p-4 rounded-3xl shadow-2xl z-[200] animate-in slide-in-from-right duration-500 flex items-center gap-3 border ${notification.type === 'success' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={notification.type === 'success' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} /></svg>
            </div>
            <span className="text-xs font-black uppercase tracking-wider">{notification.message}</span>
          </div>
        )}

        {currentRole === UserRole.EMPLOYEE ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8"><ExpenseForm onSubmit={addClaim} currentUser={currentUser} /></div>
            <div className="lg:col-span-4">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                  我的最近提报 ({currentUser || '匿名'})
                </h3>
                <div className="space-y-4">
                  {claims.filter(c => currentUser && c.applicant === currentUser && c.category === ExpenseCategory.REIMBURSEMENT).slice(0, 5).map(c => (
                    <div key={c.id} className="group p-4 rounded-[24px] bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-white transition-all duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <div className="overflow-hidden">
                          <p className="text-sm font-black text-slate-800 truncate">{c.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{c.date} · {c.type}</p>
                        </div>
                        <p className="text-sm font-black text-slate-900">¥{c.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${c.isReimbursed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {c.isReimbursed ? '已结算' : '待处理'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : currentRole === UserRole.MANAGER ? (
          <ManagerDashboard 
            claims={claims} 
            filteredClaims={filteredClaims}
            timeDimension={timeDimension}
            setTimeDimension={setTimeDimension}
            selectedTimeValue={selectedTimeValue}
            setSelectedTimeValue={setSelectedTimeValue}
            selectedApplicant={selectedApplicant}
            setSelectedApplicant={setSelectedApplicant}
            onToggleReimbursed={toggleReimbursed}
            onDelete={deleteClaim}
            onUpdateClaim={updateClaim}
            onAddDirectPayment={(p) => addClaim({...p, category: ExpenseCategory.DIRECT_PAYMENT})}
            onAddIncome={(p) => addClaim({...p, category: ExpenseCategory.INCOME})}
            onAddFixedCost={(p) => addClaim({...p, category: ExpenseCategory.FIXED_COST})}
            setCurrentRole={setCurrentRole}
          />
        ) : (
          <ReimbursementSummary 
            claims={claims} 
            filteredClaims={filteredClaims}
            timeDimension={timeDimension}
            setTimeDimension={setTimeDimension}
            selectedTimeValue={selectedTimeValue}
            setSelectedTimeValue={setSelectedTimeValue}
            selectedApplicant={selectedApplicant}
            setSelectedApplicant={setSelectedApplicant}
          />
        )}
      </main>
    </div>
  );
};

export default App;
