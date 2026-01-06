
import React, { useState, useRef, useEffect } from 'react';
import { ExpenseType, ExpenseClaim, Attachment, ExpenseCategory } from '../types';
import { analyzeReceipt } from '../services/geminiService';

interface ExpenseFormProps {
  onSubmit: (claim: Omit<ExpenseClaim, 'id' | 'createdAt' | 'isReimbursed'>) => void;
  currentUser: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, currentUser }) => {
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
  const [batchStatus, setBatchStatus] = useState<{ current: number, total: number, totalAmount: number, isFinished: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApplicant(currentUser);
  }, [currentUser]);

  const processFile = (file: File): Promise<Attachment> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: 'invoice',
          dataUrl: dataUrl,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // 批量上传：现在改为识别结果填充到当前表单，而不是直接分条提交
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    
    const fileList = Array.from(files) as File[];
    let runningTotalAmount = 0;
    let combinedDescription: string[] = [];
    let newAttachments: Attachment[] = [];
    let detectedType: ExpenseType | null = null;
    let detectedDate: string | null = null;

    setBatchStatus({ current: 0, total: fileList.length, totalAmount: 0, isFinished: false });

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setBatchStatus(prev => prev ? { ...prev, current: i + 1 } : null);
      
      try {
        const attachment = await processFile(file);
        const result = await analyzeReceipt(attachment.dataUrl);
        
        if (result) {
          if (result.amount) runningTotalAmount += result.amount;
          if (result.description) combinedDescription.push(result.description);
          if (!detectedType && result.type) detectedType = result.type as ExpenseType;
          if (!detectedDate && result.date) detectedDate = result.date;
          
          newAttachments.push({ ...attachment, type: 'invoice' });
          setBatchStatus(prev => prev ? { ...prev, totalAmount: runningTotalAmount } : null);
        }
      } catch (err) {
        console.error(`识别文件 ${file.name} 失败:`, err);
      }
    }

    // 将识别出的汇总信息填充到主表单
    if (newAttachments.length > 0) {
      setAmount(runningTotalAmount.toFixed(2));
      setAttachments(prev => [...prev, ...newAttachments]);
      if (combinedDescription.length > 0) {
        setDescription(prev => (prev ? prev + '；' : '') + combinedDescription.join('；'));
      }
      if (detectedType) setType(detectedType);
      if (detectedDate) setDate(detectedDate);
    }

    setBatchStatus(prev => prev ? { ...prev, isFinished: true } : null);
    e.target.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'invoice' | 'screenshot') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    const file = files[0];
    const attachment = await processFile(file);
    const newAttachment = { ...attachment, type: fileType };

    setAttachments(prev => [...prev, newAttachment]);

    if (fileType === 'invoice') {
      setIsAnalyzing(true);
      const result = await analyzeReceipt(newAttachment.dataUrl);
      if (result) {
        if (result.date) setDate(result.date);
        if (result.amount) setAmount(result.amount.toString());
        if (result.type && Object.values(ExpenseType).includes(result.type as ExpenseType)) {
          setType(result.type as ExpenseType);
        }
        if (result.description) setDescription(result.description);
      }
      setIsAnalyzing(false);
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || !description || !applicant) {
      setError('请填写所有必填信息');
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

    // 重置表单
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* 批量识别进度覆盖层 */}
      {batchStatus && !batchStatus.isFinished && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-black mb-2 uppercase tracking-widest">智能识别并汇总中</h3>
          <p className="text-slate-400 font-bold mb-6">正在分析发票 {batchStatus.current} / {batchStatus.total}</p>
          
          <div className="w-full max-w-xs mb-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-indigo-300">
              <span>当前累计金额</span>
              <span>¥{batchStatus.totalAmount.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500 ease-out" 
                style={{ width: `${(batchStatus.current / batchStatus.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic">完成后将自动填写报销金额并关联所有附件...</p>
        </div>
      )}

      {/* 批量识别完成提示 */}
      {batchStatus?.isFinished && (
        <div className="absolute inset-0 z-50 bg-indigo-600/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-2xl font-black mb-1">识别汇总完成</h3>
          <p className="text-indigo-100 font-bold mb-8">已为您填好金额并上传了 {batchStatus.total} 份附件</p>
          <button 
            onClick={() => setBatchStatus(null)}
            className="bg-white text-indigo-600 font-black px-12 py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-xl"
          >
            开始核对并提交
          </button>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">填写报销申请单</h2>
          <p className="text-sm text-slate-500 mt-1">上传发票可由 AI 自动计算总额</p>
        </div>
        <button
          type="button"
          onClick={() => batchInputRef.current?.click()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          批量识别多张发票
        </button>
        <input 
          type="file" 
          ref={batchInputRef} 
          className="hidden" 
          multiple 
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleBatchUpload} 
        />
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* 附件展示区域 */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-slate-700">已上传附件 ({attachments.length})</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 uppercase">添加单个</button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,application/pdf" onChange={(e) => handleFileChange(e, 'invoice')} />
            </div>
          </div>
          
          {attachments.length === 0 ? (
            <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
              <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              <p className="text-[10px] font-black uppercase tracking-widest">暂无附件，点击批量识别可自动统计</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {attachments.map(att => (
                <div key={att.id} className="relative group w-24 h-24 border-2 border-white rounded-2xl bg-white shadow-sm overflow-hidden transition-transform hover:scale-105">
                  {att.mimeType === 'application/pdf' ? (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-500">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                  ) : (
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                  )}
                  <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[8px] font-black py-1 text-center truncate">{att.type === 'invoice' ? 'AI 识别发票' : '付款截图'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">申请报销人 *</label>
            <input type="text" required value={applicant} onChange={(e) => setApplicant(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">报销总金额 (元) *</label>
            <div className="relative group">
              <span className="absolute left-4 top-2.5 text-slate-400 font-bold">¥</span>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full border rounded-lg pl-8 pr-4 py-2.5 text-lg font-black outline-none transition-all ${amount && !isAnalyzing ? 'bg-indigo-50/30 border-indigo-200 text-indigo-900' : 'border-slate-200'}`}
              />
              {amount && !isAnalyzing && (
                <div className="absolute right-3 top-3 text-[8px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-100 px-1.5 py-0.5 rounded">AI 已统计</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">日期 *</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-bold outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">费用类型 *</label>
            <select value={type} onChange={(e) => setType(e.target.value as ExpenseType)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-bold outline-none">
              {Object.values(ExpenseType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">费用具体描述 *</label>
          <textarea 
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述费用用途..."
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
          <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-bold outline-none" />
        </div>

        <button 
          type="submit" 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
        >
          确认并提交汇总报销单
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
