// lib/epsonPrinter.ts

/**
 * Service to interface with the Epson ePOS JavaScript SDK for TM-T82x thermal printers.
 * Bypasses browser print dialog and sends XML commands over local IP network.
 */

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

const EPSON_PORT = '8008'; // Default HTTP port for ePOS

export async function printThermalReceipt(
  ipAddress: string,
  data: PrintBillData
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.epson) {
      resolve({ success: false, error: 'Epson SDK not loaded. Please refresh the page.' });
      return;
    }

    try {
      const ePosDev = new window.epson.ePOSDevice();

      const connectionCallback = (result: string) => {
        if (result === 'OK' || result === 'SSL_CONNECT_OK') {
          // Connected to device successfully, now create printer object
          ePosDev.createDevice('local_printer', ePosDev.DEVICE_TYPE_PRINTER, { crypto: false, buffer: false }, 
            (deviceObj: any, errorCode: string) => {
              if (deviceObj === null) {
                ePosDev.disconnect();
                resolve({ success: false, error: `Failed to create printer device. Error Code: ${errorCode}` });
                return;
              }

              const printer = deviceObj;
              
              // Handle response from printer after sending job
              printer.onreceive = function (res: any) {
                ePosDev.disconnect();
                if (res.success) {
                  resolve({ success: true });
                } else {
                  resolve({ success: false, error: 'Printer returned an error after receiving print job.' });
                }
              };

              // Build the receipt content
              const builder = new window.epson.ePOSBuilder();

              // Formatting Constants (TM-T82x is typically 80mm which fits approx 48 chars with FontA, or 42 with FontB)
              // Let's assume standard FontA 48 char width for 80mm
              const LINE_WIDTH = 48;

              // Helper for alignment
              const padRight = (str: string, len: number) => str.padEnd(len, ' ');
              const padLeft = (str: string, len: number) => str.padStart(len, ' ');
              
              // Helper to create a row like: "Item Name             2 x 10.00    20.00"
              const createItemRow = (name: string, qtyPrice: string, amt: string) => {
                const nameWidth = 24;
                const qtyPriceWidth = 14;
                const amtWidth = 10;
                
                let truncatedName = name.substring(0, nameWidth - 1);
                truncatedName = padRight(truncatedName, nameWidth);
                const paddedQtyPrice = padLeft(qtyPrice, qtyPriceWidth);
                const paddedAmt = padLeft(amt, amtWidth);
                
                return truncatedName + paddedQtyPrice + paddedAmt;
              };

              // --- BUILD RECEIPT ---
              
              // Header
              builder.addTextAlign(builder.ALIGN_CENTER);
              builder.addTextSize(2, 2);
              builder.addText(data.cafeName.toUpperCase() + '\n');
              
              builder.addTextSize(1, 1);
              if (data.cafeAddress) builder.addText(data.cafeAddress + '\n');
              if (data.cafePhone) builder.addText('Ph: ' + data.cafePhone + '\n');
              if (data.cafeGst) builder.addText('GSTIN: ' + data.cafeGst + '\n');
              
              builder.addFeedLine(1);
              builder.addTextSmooth(true);
              builder.addTextDouble(true, false);
              builder.addText(data.orderType === 'DINE_IN' ? 'DINE IN\n' : 'TAKEAWAY\n');
              builder.addTextDouble(false, false);
              builder.addFeedLine(1);

              // Meta Info
              builder.addTextAlign(builder.ALIGN_LEFT);
              builder.addText(`Date: ${data.date}   Time: ${data.time}\n`);
              if (data.customerName) builder.addText(`Cust: ${data.customerName}\n`);
              builder.addText(`Bill: ${data.billNumber}\n`);
              builder.addText('-'.repeat(LINE_WIDTH) + '\n');
              
              // Table Header
              builder.addText(createItemRow('ITEM', 'QTY/PRICE', 'AMT') + '\n');
              builder.addText('-'.repeat(LINE_WIDTH) + '\n');

              // Items
              data.items.forEach(item => {
                const qtyPrice = `${item.qty} x ${item.price.toFixed(2)}`;
                const amtStr = item.amt.toFixed(2);
                builder.addText(createItemRow(item.name, qtyPrice, amtStr) + '\n');
              });

              builder.addText('-'.repeat(LINE_WIDTH) + '\n');

              // Totals
              const subtotalStr = data.subtotal.toFixed(2);
              builder.addText(padRight('Subtotal', 38) + padLeft(subtotalStr, 10) + '\n');
              
              if (data.gstAmount > 0) {
                const gstHalf = (data.gstAmount / 2).toFixed(2);
                builder.addText(padRight('CGST (2.5%)', 38) + padLeft(gstHalf, 10) + '\n');
                builder.addText(padRight('SGST (2.5%)', 38) + padLeft(gstHalf, 10) + '\n');
              }

              builder.addText('-'.repeat(LINE_WIDTH) + '\n');
              
              builder.addTextDouble(true, true);
              const totalStr = data.total.toFixed(2);
              // For double size, width is halved to 24 chars
              builder.addText(padRight('TOTAL', 12) + padLeft(totalStr, 12) + '\n');
              builder.addTextDouble(false, false);
              
              builder.addText('-'.repeat(LINE_WIDTH) + '\n');
              
              builder.addText(`Payment Mode: ${data.paymentMethod}\n`);
              
              builder.addFeedLine(1);
              builder.addTextAlign(builder.ALIGN_CENTER);
              builder.addText('Thank You & Visit Again!\n');
              builder.addText('Powered by WebBill\n');
              builder.addFeedLine(4);
              builder.addCut(builder.CUT_FEED);

              // Send job
              // Note: For newer ePOS versions, use builder.toString(), for some very old ones builder.message.
              // ePOS JavaScript SDK v2 usually accepts builder.message if using ePOS-Print, but for ePOSDevice it uses string.
              // We'll safely use builder.toString().
              try {
                // @ts-ignore
                printer.send(builder.message || builder.toString());
              } catch (sendErr: any) {
                ePosDev.disconnect();
                resolve({ success: false, error: sendErr.message || 'Error sending print job to device.' });
              }
            }
          );
        } else {
          // Connection failed
          ePosDev.disconnect();
          resolve({ success: false, error: `Connection failed: ${result}. Check printer IP and network.` });
        }
      };

      // Connect to the printer
      ePosDev.connect(ipAddress, EPSON_PORT, connectionCallback);
      
      // Safety timeout in case the connection hangs indefinitely
      setTimeout(() => {
        resolve({ success: false, error: 'Connection timed out. Ensure the printer is on and the IP is correct.' });
      }, 10000);

    } catch (error: any) {
      resolve({ success: false, error: error.message || 'An unexpected error occurred initializing the printer.' });
    }
  });
}
