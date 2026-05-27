// lib/qzPrinter.ts
//
// QZ Tray-based thermal printer service.
// Uses the installed Windows printer driver ("EPSON TM-T82") instead of IP.
//
// Architecture:
//   WebBill (Browser) → QZ Tray WebSocket (localhost:8181) → Windows Driver → Printer
//
// Prerequisites:
//   - QZ Tray must be installed: https://qz.io/download/
//   - QZ Tray must be running in the system tray before printing
//   - qz-tray.js must be loaded via script tag (see app/layout.tsx)

declare const qz: any;

export interface PrintItem {
  name: string;
  qty: number;
  price: number;
  amt: number;
}

export interface PrintBillData {
  cafeName: string;
  cafeAddress?: string;
  cafePhone?: string;
  cafeGst?: string;
  orderType: string;
  date: string;
  time: string;
  customerName?: string;
  billNumber: string;
  items: PrintItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMethod: string;
}

// ESC/POS command constants
const ESC = '\x1B';
const GS  = '\x1D';
const NUL = '\x00';

const CMD = {
  INIT:           ESC + '@',                  // Initialize printer
  CUT:            GS  + 'V\x41\x03',         // Full cut with feed
  ALIGN_LEFT:     ESC + 'a\x00',
  ALIGN_CENTER:   ESC + 'a\x01',
  ALIGN_RIGHT:    ESC + 'a\x02',
  BOLD_ON:        ESC + 'E\x01',
  BOLD_OFF:       ESC + 'E\x00',
  DOUBLE_HEIGHT:  ESC + '!\x10',             // Double height text
  DOUBLE_SIZE:    ESC + '!\x30',             // Double width + height
  NORMAL_SIZE:    ESC + '!\x00',             // Normal text
  LINE_FEED:      '\n',
  CASH_DRAWER:    ESC + 'p' + NUL + '\x19\xFA', // Open cash drawer pin 2
};

// 80mm printer: 48 characters at normal size (Font A)
const LINE_WIDTH = 48;

function repeat(char: string, n: number): string {
  return char.repeat(Math.max(0, n));
}

function padRight(str: string, len: number): string {
  const truncated = str.substring(0, len);
  return truncated.padEnd(len, ' ');
}

function padLeft(str: string, len: number): string {
  return str.padStart(len, ' ');
}

/** Build a two-column row, left + right aligned to LINE_WIDTH */
function twoColRow(left: string, right: string): string {
  const maxLeft = LINE_WIDTH - right.length - 1;
  const truncLeft = left.substring(0, maxLeft);
  const spaces = LINE_WIDTH - truncLeft.length - right.length;
  return truncLeft + repeat(' ', spaces) + right;
}

/** Build item row: name | qty x price | amount */
function itemRow(name: string, qty: number, price: number, amt: number): string {
  const NAME_W = 22;
  const QP_W   = 14;
  const AMT_W  = 10;

  const nameStr  = padRight(name, NAME_W);
  const qpStr    = padLeft(`${qty}x${price.toFixed(2)}`, QP_W);
  const amtStr   = padLeft(amt.toFixed(2), AMT_W);

  return nameStr + qpStr + amtStr;
}

/**
 * Builds the raw ESC/POS byte string for a thermal receipt.
 */
function buildReceiptCommands(data: PrintBillData): string {
  let r = '';

  r += CMD.INIT;

  // ── HEADER ──────────────────────────────────────────────────
  r += CMD.ALIGN_CENTER;
  r += CMD.BOLD_ON;
  r += CMD.DOUBLE_SIZE;
  r += data.cafeName.toUpperCase() + CMD.LINE_FEED;
  r += CMD.NORMAL_SIZE;
  r += CMD.BOLD_OFF;

  if (data.cafeAddress) r += data.cafeAddress + CMD.LINE_FEED;
  if (data.cafePhone)   r += 'Ph: ' + data.cafePhone + CMD.LINE_FEED;
  if (data.cafeGst)     r += 'GSTIN: ' + data.cafeGst + CMD.LINE_FEED;

  r += CMD.LINE_FEED;
  r += CMD.BOLD_ON;
  r += CMD.DOUBLE_HEIGHT;
  r += (data.orderType === 'DINE_IN' ? 'DINE IN' : 'TAKEAWAY') + CMD.LINE_FEED;
  r += CMD.NORMAL_SIZE;
  r += CMD.BOLD_OFF;

  // ── META INFO ────────────────────────────────────────────────
  r += CMD.ALIGN_LEFT;
  r += CMD.LINE_FEED;
  r += twoColRow(`Date: ${data.date}`, `Time: ${data.time}`) + CMD.LINE_FEED;
  if (data.customerName) r += `Cust: ${data.customerName}` + CMD.LINE_FEED;
  r += `Bill No: ${data.billNumber}` + CMD.LINE_FEED;

  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;

  // ── ITEMS HEADER ─────────────────────────────────────────────
  r += CMD.BOLD_ON;
  r += itemRow('ITEM', 1, 0, 0)
         .replace('1x0.00', 'QTY/PRICE')
         .replace('      0.00', '    AMOUNT') + CMD.LINE_FEED;
  r += CMD.BOLD_OFF;
  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;

  // ── ITEMS ────────────────────────────────────────────────────
  data.items.forEach(item => {
    r += itemRow(item.name, item.qty, item.price, item.amt) + CMD.LINE_FEED;
  });

  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;

  // ── TOTALS ───────────────────────────────────────────────────
  r += twoColRow('Subtotal', data.subtotal.toFixed(2)) + CMD.LINE_FEED;

  if (data.gstAmount > 0) {
    const half = (data.gstAmount / 2).toFixed(2);
    r += twoColRow('CGST (2.5%)', half) + CMD.LINE_FEED;
    r += twoColRow('SGST (2.5%)', half) + CMD.LINE_FEED;
  }

  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;

  // Total — double size (width halved to 24 chars)
  r += CMD.BOLD_ON;
  r += CMD.DOUBLE_SIZE;
  const totalLabel = 'TOTAL';
  const totalVal   = '\u20B9' + data.total.toFixed(2); // ₹
  const totalSpaces = 24 - totalLabel.length - totalVal.length;
  r += totalLabel + repeat(' ', totalSpaces) + totalVal + CMD.LINE_FEED;
  r += CMD.NORMAL_SIZE;
  r += CMD.BOLD_OFF;

  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;
  r += twoColRow('Payment Mode:', data.paymentMethod) + CMD.LINE_FEED;

  // ── FOOTER ───────────────────────────────────────────────────
  r += CMD.LINE_FEED;
  r += CMD.ALIGN_CENTER;
  r += CMD.BOLD_ON;
  r += 'Thank You & Visit Again!' + CMD.LINE_FEED;
  r += CMD.BOLD_OFF;
  r += 'Powered by WebBill POS' + CMD.LINE_FEED;

  // Feed + Cut
  r += repeat(CMD.LINE_FEED, 4);
  r += CMD.CUT;

  return r;
}

/**
 * Builds a simple test page to verify printer connectivity.
 */
function buildTestCommands(printerName: string): string {
  let r = '';
  r += CMD.INIT;
  r += CMD.ALIGN_CENTER;
  r += CMD.BOLD_ON;
  r += CMD.DOUBLE_SIZE;
  r += 'TEST PRINT' + CMD.LINE_FEED;
  r += CMD.NORMAL_SIZE;
  r += CMD.BOLD_OFF;
  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;
  r += `Printer: ${printerName}` + CMD.LINE_FEED;
  r += 'WebBill QZ Tray connection' + CMD.LINE_FEED;
  r += 'is working correctly!' + CMD.LINE_FEED;
  r += repeat('-', LINE_WIDTH) + CMD.LINE_FEED;
  r += 'Powered by WebBill POS' + CMD.LINE_FEED;
  r += repeat(CMD.LINE_FEED, 4);
  r += CMD.CUT;
  return r;
}

/**
 * Connect to QZ Tray if not already connected.
 */
async function ensureConnected(): Promise<void> {
  if (typeof qz === 'undefined') {
    throw new Error(
      'QZ Tray script not loaded. Please refresh the page.'
    );
  }
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

/**
 * Print a thermal receipt via QZ Tray using the Windows printer name.
 */
export async function printWithQZTray(
  printerName: string,
  data: PrintBillData
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureConnected();

    const config = qz.configs.create(printerName, {
      raw: true,
      encoding: 'Cp1252', // Western European — works for ₹ via custom mapping
    });

    const receiptText = buildReceiptCommands(data);

    const printData = [{ type: 'raw', format: 'plain', data: receiptText }];

    await qz.print(config, printData);

    return { success: true };
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);

    // Give a friendly message if QZ Tray is not running
    if (msg.includes('Unable to establish') || msg.includes('WebSocket') || msg.includes('connect')) {
      return {
        success: false,
        error: 'QZ Tray is not running. Please start QZ Tray from the system tray and try again.',
      };
    }

    if (msg.includes('not found') || msg.includes('printer')) {
      return {
        success: false,
        error: `Printer "${printerName}" not found. Check the name in Settings → Hardware Configuration.`,
      };
    }

    return { success: false, error: msg };
  }
}

/**
 * Send a test page to verify printer name and QZ Tray connectivity.
 */
export async function printTestPage(
  printerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureConnected();

    const config = qz.configs.create(printerName, { raw: true });
    const testText = buildTestCommands(printerName);
    const printData = [{ type: 'raw', format: 'plain', data: testText }];

    await qz.print(config, printData);
    return { success: true };
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);

    if (msg.includes('Unable to establish') || msg.includes('WebSocket') || msg.includes('connect')) {
      return {
        success: false,
        error: 'QZ Tray is not running. Please start it from the system tray.',
      };
    }

    return { success: false, error: msg };
  }
}
