// FILE: client/src/components/workspace/device-switcher.ts
export type DeviceKey =
  | "full"
  | "desktop"
  | "laptop"
  | "tablet"
  | "iphone-se"
  | "iphone-17"
  | "pixel-10"
  | "s25";

export type Device = {
  key: DeviceKey;
  label: string;
  width: number | string;
  height: number | string;
};

export const devices: Device[] = [
  { key: "full", label: "Full size", width: "100%", height: "100%" },
  { key: "desktop", label: "Desktop 1920", width: 1440, height: 900 },
  { key: "laptop", label: "Laptop 1366", width: 1280, height: 720 },
  { key: "tablet", label: "Tablet", width: 820, height: 1180 },
  { key: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { key: "iphone-17", label: "iPhone 17", width: 393, height: 852 },
  { key: "pixel-10", label: "Pixel 10", width: 412, height: 915 },
  { key: "s25", label: "Samsung Galaxy S25", width: 412, height: 915 }
];