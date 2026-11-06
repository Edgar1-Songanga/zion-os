declare function qrcode(typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): {
  addData(data: string, mode?: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
};

export default qrcode;
