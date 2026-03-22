import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isProductionSite(): boolean {
  return window.location.hostname === "mrcodeai.com" || window.location.hostname === "www.mrcodeai.com";
}
