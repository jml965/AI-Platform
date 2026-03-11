export type ProductIntentType =
  | "landing-page"
  | "business-website"
  | "dashboard"
  | "admin-panel"
  | "marketplace"
  | "auction-platform"
  | "saas-app"
  | "crud-app"
  | "content-site"
  | "portfolio"
  | "general-web-app";

export interface ProductIntentResult {
  type: ProductIntentType;
  confidence: number;
  signals: string[];
  rtl: boolean;
  language: "ar" | "en";
  aiClassified?: boolean;
  aiModel?: string;
}
