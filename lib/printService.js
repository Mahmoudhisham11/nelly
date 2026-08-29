import { formatNumber } from "./utils";

export function printInventorySheet(products = []) {
  if (typeof window === "undefined") return;

  const currentDate = new Date();
  const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const formattedDate = `${dayNames[currentDate.getDay()]} ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const totalItems = products.length;
  const totalQty = products.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const rowsHtml = products.map((p, idx) => {
    const isEven = idx % 2 === 0;
    const barcodeVal = p.barcode || p.code || "—";
    const qtyVal = formatNumber(p.quantity || 0);

    return `
      <tr style="background-color: ${isEven ? '#ffffff' : '#f9fafb'};">
        <td style="text-align: center; font-weight: bold; color: #4b5563;">${idx + 1}</td>
        <td style="font-weight: bold; color: #111827; font-size: 11pt;">${p.name || 'بدون اسم'}</td>
        <td style="text-align: center; font-family: monospace; font-size: 11pt; font-weight: bold; color: #1f2937; letter-spacing: 1px;">
          ${barcodeVal}
        </td>
        <td style="text-align: center; font-weight: bold; font-size: 12pt; color: #111827;">
          ${qtyVal} <span style="font-size: 9pt; font-weight: normal; color: #6b7280;">قطعة</span>
        </td>
      </tr>
    `;
  }).join("");

  const printWindow = window.open("", "_blank", "width=900,height=750");

  if (!printWindow) {
    // If popup blocked, alert user
    alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لإتمام طباعة الكشف.");
    return;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف جرد مخزن Nelly للميكاب</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
          color: #000000;
          background: #ffffff;
          padding: 20px;
          direction: rtl;
          text-align: right;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #db2777;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .brand-title {
          font-size: 18pt;
          font-weight: 900;
          color: #db2777;
          letter-spacing: -0.5px;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: 800;
          color: #111827;
          margin-top: 3px;
        }
        .doc-date {
          font-size: 9.5pt;
          color: #4b5563;
          margin-top: 4px;
        }
        .summary-box {
          border: 1.5px solid #fbcfe8;
          background: #fdf2f8;
          border-radius: 8px;
          padding: 8px 16px;
          text-align: center;
          min-width: 200px;
        }
        .summary-title {
          font-size: 9pt;
          color: #6b7280;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .summary-content {
          font-size: 10pt;
          color: #111827;
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .summary-content strong {
          color: #9d174d;
          font-size: 11pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        thead tr {
          background-color: #f3f4f6;
        }
        th {
          border: 1.5px solid #374151;
          padding: 10px 12px;
          font-size: 11pt;
          font-weight: 800;
          color: #111827;
          text-align: right;
        }
        td {
          border: 1px solid #d1d5db;
          padding: 9px 12px;
          font-size: 10.5pt;
          text-align: right;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 35px;
          padding-top: 14px;
          border-top: 1px dashed #9ca3af;
          font-size: 10pt;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">مخزن NELLY للميكاب ومستحضرات التجميل</div>
          <div class="doc-title">كشف جرد الأصناف والبضاعة بالمخزن</div>
          <div class="doc-date">تاريخ الاستخراج: <strong>${formattedDate}</strong></div>
        </div>
        <div class="summary-box">
          <div class="summary-title">ملخص الجرد الحالي</div>
          <div class="summary-content">
            <div>الأصناف: <strong>${formatNumber(totalItems)}</strong></div>
            <div>إجمالي القطع: <strong>${formatNumber(totalQty)}</strong></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>اسم المنتج</th>
            <th style="width: 180px; text-align: center;">باركود المنتج</th>
            <th style="width: 140px; text-align: center;">الكمية بالمخزن</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>نظام إدارة مخزن <strong>Nelly</strong> لمستحضرات التجميل</div>
        <div>توقيع مسؤول المخزن: _________________________</div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();

  // Print automatically once content is loaded
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
