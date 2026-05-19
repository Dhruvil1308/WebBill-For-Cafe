// types/epson.d.ts

declare namespace epson {
  class ePOSDevice {
    constructor();
    DEVICE_TYPE_PRINTER: any;
    connect(ip: string, port: string | number, callback: (result: string) => void, options?: any): void;
    createDevice(deviceId: string, deviceType: any, options: any, callback: (obj: any, code: string) => void): void;
    deleteDevice(deviceObj: any, callback: (code: string) => void): void;
    disconnect(): void;
  }

  class ePOSBuilder {
    constructor();
    addText(data: string): ePOSBuilder;
    addTextLang(lang: string): ePOSBuilder;
    addTextAlign(align: number): ePOSBuilder;
    addTextSize(width: number, height: number): ePOSBuilder;
    addTextSmooth(smooth: boolean): ePOSBuilder;
    addTextDouble(width: boolean, height: boolean): ePOSBuilder;
    addCut(type: number): ePOSBuilder;
    addFeedLine(lines: number): ePOSBuilder;
    addFeedPosition(pos: number): ePOSBuilder;
    addImage(context: any, x: number, y: number, width: number, height: number, color: number, mode: number): ePOSBuilder;
    toString(): string;
    
    // Constants
    ALIGN_LEFT: number;
    ALIGN_CENTER: number;
    ALIGN_RIGHT: number;
    CUT_NO_FEED: number;
    CUT_FEED: number;
    CUT_RESERVE: number;
    COLOR_1: number;
    COLOR_2: number;
    COLOR_3: number;
    COLOR_4: number;
    MODE_MONO: number;
    MODE_GRAY16: number;
  }
}

interface Window {
  epson: typeof epson;
}
