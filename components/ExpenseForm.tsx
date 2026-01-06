
import React, { useState, useRef, useEffect } from 'react';
import { ExpenseType, ExpenseClaim, Attachment, ExpenseCategory } from '../types';
import { analyzeReceipt } from '../services/geminiService';

interface ExpenseFormProps {
  onSubmit: (claim: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed'>) => void;
  currentUser: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, currentUser }) => {
  // 获取本地日期 YYYY-MM-DD
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDate());
  const [type, setType] = useState<ExpenseType>(ExpenseType.OTHER);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [applicant, setApplicant] = useState(currentUser);
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApplicant(currentUser);
  }, [currentUser]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'invoice' | 'screenshot') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: fileType,
        dataUrl: dataUrl,
        mimeType: file.type
      };

      setAttachments(prev => {
        const others = prev.filter(a => a.type !== fileType);
        return [...others, newAttachment];
      });

      if (fileType === 'invoice') {
        setIsAnalyzing(true);
        const result = await analyzeReceipt(dataUrl);
        if (result) {
          if (result.date) {
            // 确保日期补零
            const parts = result.date.split('-');
            if (parts.length === 3) {
                const normalized = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                setDate(normalized);
            } else {
                setDate(result.date);
            }
          }
          if (result.amount) setAmount(result.amount.toString());
          if (result.type && Object.values(ExpenseType).includes(result.type as ExpenseType)) {
            setType(result.type as ExpenseType);
          }
          if (result.description) setDescription(result.description);
        }
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || !description || !applicant) {
      setError('请填写所有必填信息');
      return;
    }

    if (attachments.length === 0) {
      setError('请至少上传一张发票或付款截图');
      return;
    }

    onSubmit({
      date,
      type,
      category: ExpenseCategory.REIMBURSEMENT,
      amount: parseFloat(amount),
      description,
      applicant: applicant,
      remarks,
      attachments
    });

    setDate(getLocalDate());
    setType(ExpenseType.OTHER);
    setAmount('');
    setDescription('');
    setRemarks('');
    setAttachments([]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const hasInvoice = attachments.some(a => a.type === 'invoice');
  const hasScreenshot = attachments.some(a => a.type === 'screenshot');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-semibold text-slate-800">填写报销申请单</h2>
        <p className="text-sm text-slate-500 mt-1">上传发票(JPG/PDF)可自动识别内容</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in zoom-in-95">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
          <label className="block text-sm font-bold text-slate-700">快速上传附件 (AI 自动识别发票) *</label>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-2xl transition-all group relative ${
                hasInvoice ? 'border-blue-500 bg-white shadow-md' : 'border-slate-300 hover:border-blue-500 hover:bg-white'
              }`}
            >
              <svg className={`w-8 h-8 ${hasInvoice ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-slate-500 mt-2 font-black uppercase tracking-widest">{hasInvoice ? '更换发票' : '上传发票'}</span>
              {hasInvoice && (
                <div className="absolute -top-3 -right-3 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => handleFileChange(e, 'invoice')} 
            />
            
            <button
              type="button"
              className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-2xl transition-all group relative ${
                hasScreenshot ? 'border-emerald-500 bg-white shadow-md' : 'border-slate-300 hover:border-emerald-500 hover:bg-white'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/png,application/pdf';
                input.onchange = (e) => handleFileChange(e as any, 'screenshot');
                input.click();
              }}
            >
              <svg className={`w-8 h-8 ${hasScreenshot ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-slate-500 mt-2 font-black uppercase tracking-widest">{hasScreenshot ? '更换截图' : '付款截图'}</span>
              {hasScreenshot && (
                <div className="absolute -top-3 -right-3 bg-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            {attachments.map(att => (
              <div key={att.id} className={`relative group w-20 h-20 border rounded-xl bg-white flex items-center justify-center overflow-hidden transition-all ${att.type === 'screenshot' ? 'ring-2 ring-emerald-50 border-emerald-200' : 'ring-2 ring-blue-50 border-blue-200'}`}>
                {att.mimeType === 'application/pdf' ? (
                  <div className={`flex flex-col items-center justify-center p-1 w-full h-full ${att.type === 'screenshot' ? 'text-emerald-500 bg-emerald-50/30' : 'text-blue-500 bg-blue-50/30'}`}>
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                ) : (
                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                )}
                <button 
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-bl opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className={`absolute bottom-0 left-0 right-0 text-white text-[9px] truncate px-1 py-1 pointer-events-none font-black text-center z-10 ${att.type === 'screenshot' ? 'bg-emerald-500/80' : 'bg-blue-500/80'}`}>
                  {att.type === 'invoice' ? '发票' : '截图'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">申请报销人 *</label>
            <input 
              type="text" 
              required
              placeholder="人员姓名"
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">费用发生日期 *</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">费用类型 *</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as ExpenseType)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
            >
              {Object.values(ExpenseType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">报销金额 (元) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">¥</span>
              <input 
                type="number" 
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold text-slate-900"
              />
              {isAnalyzing && (
                <div className="absolute right-3 top-2 flex items-center gap-1 text-blue-500 animate-pulse text-xs font-bold bg-white pl-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  智能分析中...
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">费用具体描述 *</label>
          <textarea 
            required
            placeholder="例如：客户宴请、差旅住宿等"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">备注说明</label>
          <textarea 
            placeholder="如有特殊说明请在此填写"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          确认并提交报销申请单
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
