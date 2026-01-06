
import React, { useMemo } from 'react';
import { ExpenseClaim, ExpenseCategory, ExpenseType, TimeDimension } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface ReimbursementSummaryProps {
  claims: ExpenseClaim[];
  filteredClaims: ExpenseClaim[];
  timeDimension: TimeDimension;
  setTimeDimension: (d: TimeDimension) => void;
  selectedTimeValue: string;
  setSelectedTimeValue: (v: string) => void;
  selectedApplicant: string;
  setSelectedApplicant: (a: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const ReimbursementSummary: React.FC<ReimbursementSummaryProps> = ({ 
  claims,
  filteredClaims,
  timeDimension, setTimeDimension,
  selectedTimeValue, setSelectedTimeValue,
  selectedApplicant, setSelectedApplicant
}) => {
  const stats = useMemo(() => {
    // 仅针对个人报销进行汇总分析
    const reimbursementClaims = filteredClaims.filter(c => c.category === ExpenseCategory.REIMBURSEMENT);
    
    const totalAmount = reimbursementClaims.reduce((sum, c) => sum + c.amount, 0);
    const count = reimbursementClaims.length;
    const uniqueApplicants = new Set(reimbursementClaims.map(c => c.applicant)).size;
    
    // 计算发票缺失总金额 (没有任何附件类型为 'invoice')
    const missingInvoiceTotal = reimbursementClaims
      .filter(c => !c.attachments.some(att => att.type === 'invoice'))
      .reduce((sum, c) => sum + c.amount, 0);

    // 按类型分布
    const typeMap: Record<string, number> = {};
    reimbursementClaims.forEach(c => {
      typeMap[c.type] = (typeMap[c.type] || 0) + c.amount;
    });
    const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // 按人分布
    const applicantMap: Record<string, number> = {};
    reimbursementClaims.forEach(c => {
      applicantMap[c.applicant] = (applicantMap[c.applicant] || 0) + c.amount;
    });
    const applicantData = Object.entries(applicantMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalAmount, count, uniqueApplicants, missingInvoiceTotal, typeData, applicantData };
  }, [filteredClaims]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">总报销额</p>
          <p className="text-2xl font-black text-slate-900">¥{stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">提报笔数</p>
          <p className="text-2xl font-black text-slate-900">{stats.count} <span className="text-xs text-slate-400 font-bold uppercase">项</span></p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">涉及人数</p>
          <p className="text-2xl font-black text-slate-900">{stats.uniqueApplicants} <span className="text-xs text-slate-400 font-bold uppercase">人</span></p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">发票缺失总额</p>
          <p className="text-2xl font-black text-amber-900">¥{stats.missingInvoiceTotal.toLocaleString()}</p>
        </div>
        <div className="bg-indigo-600 p-6 rounded-[32px] shadow-xl shadow-indigo-100">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">最高支出项</p>
          <p className="text-xl font-black text-white truncate">
            {[...stats.typeData].sort((a,b) => b.value - a.value)[0]?.name || '无数据'}
          </p>
        </div>
      </div>

      {/* 过滤控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <select 
            value={timeDimension} 
            onChange={(e) => setTimeDimension(e.target.value as any)}
            className="text-xs font-black border-none bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="month">按月统计</option>
            <option value="quarter">按季统计</option>
            <option value="year">按年统计</option>
            <option value="all">显示全部</option>
          </select>
          {timeDimension !== 'all' && (
            <input 
              type={timeDimension === 'year' ? "number" : timeDimension === 'month' ? "month" : "text"} 
              value={selectedTimeValue}
              onChange={e => setSelectedTimeValue(e.target.value)}
              className="text-xs font-black border border-slate-100 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
        <select 
          value={selectedApplicant} 
          onChange={(e) => setSelectedApplicant(e.target.value)}
          className="text-xs font-black border border-slate-100 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">所有申请人</option>
          {Array.from(new Set(claims.filter(c => c.category === ExpenseCategory.REIMBURSEMENT).map(c => c.applicant))).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 费用类型分布 */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 h-[450px] flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            费用分类构成分析
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 申请人排名 */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 h-[450px] flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            申请人支出排名
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.applicantData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReimbursementSummary;
