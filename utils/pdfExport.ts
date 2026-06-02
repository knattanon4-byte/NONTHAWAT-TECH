import { jsPDF } from 'jspdf';

interface CalcValues {
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
}

export const generateQuotationPDF = (
  customerName: string,
  items: Array<{ description: string; quantity: number; unit_price: number }>,
  calculations: CalcValues
) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    // ใช้ฟอนต์มาตรฐานสากล เสถียร 100% ทั่วโลก
    doc.setFont('helvetica', 'normal');

    // --- QUANTUM MATRIX LIGHT CYBERPUNK THEME ---
    // ปล่อยพื้นหลังเป็นสีขาวธรรมชาติของ PDF เพื่อป้องกันระบบมือถือกลับสีเอ๋อ และพร้อมสำหรับสั่ง Print
    
    // System Header (สีฟ้าไซไฟเข้ม Cyan-600)
    doc.setTextColor(8, 145, 178); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('QUANTUM LEDGER MANIFEST', 15, 25);

    // Metadata Records (ข้อมูลระบบส่วนตัว)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // สี Slate-600
    doc.setFontSize(10);
    doc.text('ISSUED BY: NONTHAWAT.TECH NETWORK', 15, 35);
    
    doc.setTextColor(15, 23, 42); // สี Slate-900 (เข้มชัดเจน)
    doc.setFont('helvetica', 'bold');
    doc.text(`TARGET ENTITY: ${customerName.toUpperCase()}`, 15, 43); 
    doc.setFont('helvetica', 'normal');
    doc.text(`STARDATE TIMESTAMP: ${new Date().toISOString().split('T')[0]}`, 15, 51);

    // เส้นแบ่งสัดส่วนโครงสร้าง (Slate-200)
    doc.setDrawColor(226, 232, 240); 
    doc.line(15, 58, 195, 58);

    // แถบหัวตารางสินค้า (ถมสี Slate-900 ดุดัน)
    doc.setFillColor(15, 23, 42); 
    doc.rect(15, 65, 180, 8, 'F');
    
    doc.setTextColor(204, 251, 241); // ตัวหนังสือสีเขียวมิ้นต์สว่างในแถบดำ
    doc.setFont('helvetica', 'bold');
    doc.text('Allocation Node Profile', 18, 70);
    doc.text('QTY', 130, 70);
    doc.text('UNIT FEE (THB)', 160, 70);

    // ลูปวาดรายการข้อมูลตัวหนังสือสีเข้ม อ่านง่ายทุกอุปกรณ์
    let currentY = 82;
    doc.setTextColor(15, 23, 42); 
    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
      doc.text(item.description || 'Resource Allocation Node', 18, currentY);
      doc.text(String(item.quantity), 132, currentY);
      doc.text(`THB ${item.unit_price.toLocaleString()}`, 160, currentY);
      
      // เส้นใต้แบ่งรายการสินค้าแต่ละชิ้น (Slate-100 บางๆ)
      doc.setDrawColor(241, 245, 249); 
      doc.line(15, currentY + 4, 195, currentY + 4);
      currentY += 12;
    });

    // บล็อกสรุปผลลัพธ์ทางการเงินด้านล่าง
    const summaryY = currentY + 10;
    doc.setTextColor(71, 85, 105);
    doc.text(`Subtotal Balance: THB ${calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 130, summaryY);
    doc.text(`Matrix Discount: -THB ${calculations.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 130, summaryY + 6);
    doc.text(`Operational VAT (7%): THB ${calculations.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 130, summaryY + 12);

    // ยอดรวมสุทธิขั้นสุดท้าย (ไฮไลต์สีม่วงเข้มเด่นชัด Purple-700)
    doc.setTextColor(109, 40, 217); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Absolute Sum: THB ${calculations.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 122, summaryY + 22);

    // สั่งดาวน์โหลดไฟล์ลงเครื่อง
    doc.save(`QUOTATION-${customerName.replace(/\s+/g, '_').toUpperCase()}.pdf`);

  } catch (error) {
    console.error('PDF Generation pipeline collapsed:', error);
    alert('Critical Core Error: Unable to compile encrypted manifest data.');
  }
};