import * as XLSX from 'xlsx';

/**
 * Universal Excel (.xlsx) Exporter for Banking Portfolios
 * @param {Array<Object>} rows Array of plain objects or records
 * @param {string} fileName Base filename without extension
 * @param {string} sheetName Name of the worksheet
 */
export function exportToExcel(rows, fileName = 'Report', sheetName = 'Data') {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
}
