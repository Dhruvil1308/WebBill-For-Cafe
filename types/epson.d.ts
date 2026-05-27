// types/epson.d.ts — repurposed for QZ Tray ambient types
// Migrated from Epson ePOS SDK to QZ Tray (Windows printer driver bridge)
// Full QZ Tray API docs: https://qz.io/api/

interface QZConfig {
  printer: string;
  [key: string]: any;
}

interface QZPrintData {
  type: 'raw' | 'pixel' | 'html';
  format?: 'plain' | 'base64' | 'file' | 'hex';
  data: string;
  options?: Record<string, any>;
}

interface QZTray {
  websocket: {
    connect(options?: Record<string, any>): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  };
  configs: {
    create(printer: string, options?: Record<string, any>): QZConfig;
  };
  print(config: QZConfig, data: QZPrintData[]): Promise<void>;
}

declare const qz: QZTray;
