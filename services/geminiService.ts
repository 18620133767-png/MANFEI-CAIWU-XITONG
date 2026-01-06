
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, ExpenseType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeReceipt = async (dataUrl: string): Promise<AIAnalysisResult | null> => {
  try {
    const [prefix, base64Data] = dataUrl.split(',');
    const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';

    // Fix: Simplified contents format to match instructions
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "请分析这份附件（发票、收据或付款截图）。提取日期、金额、费用类型和具体描述。费用类型必须是以下之一：差旅费、餐饮费、办公用品、交通费、通讯费、业务招待费、软件购买费、版权购买费、其他。请务必以JSON格式返回，不要包含Markdown代码块标识。"
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            amount: { type: Type.NUMBER, description: "Total amount as a number" },
            type: { type: Type.STRING, description: "Category of the expense" },
            description: { type: Type.STRING, description: "Short description of the expense" }
          },
          required: ["amount"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as AIAnalysisResult;
    }
    return null;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};
