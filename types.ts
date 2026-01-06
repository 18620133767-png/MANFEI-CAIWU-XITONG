
export enum ExpenseType {
  TRAVEL = '差旅费',
  MEAL = '餐饮费',
  OFFICE = '办公用品',
  TRANSPORT = '交通费',
  COMMUNICATION = '通讯费',
  ENTERTAINMENT = '业务招待费',
  SOFTWARE = '软件购买费',
  COPYRIGHT = '版权购买费',
  RENT = '房租',
  UTILITIES = '水电费',
  SOCIAL_SECURITY = '人员社保',
  SALARY = '人员工资',
  TAX = '税费',
  OUTSOURCING = '外包服务',
  VENDOR_PAYMENT = '供应商货款',
  SALES_INCOME = '业务销售收入',
  SERVICE_INCOME = '服务咨询收入',
  OTHER_INCOME = '其他收入',
  OTHER = '其他'
}

export enum UserRole {
  EMPLOYEE = '人员模式',
  MANAGER = '总经理看板',
  SUMMARY = '报销汇总'
}

export type TimeDimension = 'all' | 'year' | 'quarter' | 'month';

export enum ExpenseCategory {
  REIMBURSEMENT = '个人报销',
  DIRECT_PAYMENT = '公对公支付',
  INCOME = '业务收入',
  FIXED_COST = '固定成本'
}

export interface Attachment {
  id: string;
  name: string;
  type: 'invoice' | 'screenshot' | 'contract';
  dataUrl: string;
  mimeType: string;
}

export interface ExpenseClaim {
  id: string;
  date: string;
  type: ExpenseType;
  category: ExpenseCategory;
  amount: number;
  description: string;
  applicant: string;
  vendor?: string;
  remarks: string;
  isReimbursed: boolean;
  attachments: Attachment[];
  createdAt: number;
  templateId?: string;
}

export interface AIAnalysisResult {
  date?: string;
  amount?: number;
  type?: ExpenseType;
  description?: string;
}
