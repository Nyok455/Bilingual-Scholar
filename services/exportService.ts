
import { StudySection, AppTheme, THEMES } from "../types";

// Helper to convert Blob URL to Base64 for PPTX export
const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to convert image for export", error);
    return "";
  }
};

// Helper to strip hex hash for PptxGenJS which often expects "FFFFFF" not "#FFFFFF"
const cleanHex = (hex: string) => hex.replace('#', '');

export const exportToPptx = async (sections: StudySection[], fileName: string, theme: AppTheme) => {
  if (!window.PptxGenJS) {
    throw new Error("PPTX generator not loaded");
  }
  
  const pres = new window.PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  
  // Clean filename for title
  const cleanName = fileName.replace(/\.[^/.]+$/, "");
  pres.title = cleanName;

  // Colors from theme
  const colPrimary = cleanHex(theme.colors.primary);
  const colSecondary = cleanHex(theme.colors.secondary);
  const colBg = cleanHex(theme.colors.bg);
  const colText = cleanHex(theme.colors.text);
  const colSubtext = cleanHex(theme.colors.subtext);
  const colCard = cleanHex(theme.colors.card);

  // 1. Define Master Slide for Professional Look
  pres.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: colBg },
    objects: [
        // Footer Bar
        { rect: { x: 0, y: 6.8, w: "100%", h: 0.7, fill: { color: colCard } } },
        { line: { x: 0, y: 6.8, w: "100%", h: 0, line: { color: colSecondary, width: 2 } } },
        { text: { text: "Bilingual Scholar", options: { x: 0.5, y: 6.95, fontSize: 10, color: colSubtext, fontFace: "Arial" } } },
        { slideNumber: { x: 9.0, y: 6.95, fontSize: 10, color: colSubtext, fontFace: "Arial" } }
    ]
  });

  // 2. Title Slide
  let slide = pres.addSlide({ masterName: "MASTER_SLIDE" });
  
  // Decorative Element
  slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 0.5, w: 9, h: 4.5, fill: { color: colCard }, line: { color: colSecondary } });
  
  slide.addText("Bilingual Study Guide", { 
    x: 1, y: 1.5, w: 8, fontSize: 44, color: colPrimary, bold: true, align: "center", fontFace: "Arial" 
  });
  slide.addText(`Based on: ${cleanName}`, { 
    x: 1, y: 3, w: 8, fontSize: 20, color: colText, align: "center", fontFace: "Arial" 
  });
  
  // 3. Section Slides
  for (const section of sections) {
    // A. Section Title Slide
    let sectionSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
    
    // Background Band
    sectionSlide.addShape(pres.ShapeType.rect, { x: 0, y: 2.5, w: "100%", h: 2.5, fill: { color: colPrimary } });
    
    sectionSlide.addText(section.topic, { 
      x: 0.5, y: 3, w: "90%", fontSize: 36, color: "FFFFFF", bold: true, align: "center", fontFace: "Arial" 
    });

    // Images Slide (if present)
    if (section.images && section.images.length > 0) {
       // Convert first 2 images to base64 to embed them
       const imgPromises = section.images.slice(0, 2).map(img => blobUrlToBase64(img));
       const base64Images = await Promise.all(imgPromises);

       let imgSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
       imgSlide.addText(`${section.topic} - Visuals`, { x:0.5, y:0.5, w:"90%", fontSize:24, color: colPrimary, bold: true });
       imgSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.0, w: "90%", h: 0, line: {color: colSecondary} });
       
       base64Images.forEach((b64, idx) => {
         if (b64) {
           const xPos = idx === 0 ? 0.5 : 5.25;
           imgSlide.addImage({ data: b64, x: xPos, y: 1.2, w: 4.25, h: 3.5, sizing: { type: "contain", w: 4.25, h: 3.5 } });
         }
       });
       
       if (section.visualSummary) {
          imgSlide.addText(section.visualSummary, { 
              x: 0.5, y: 5.0, w: "90%", fontSize: 12, color: colSubtext, italic: true, 
              shape: pres.ShapeType.rect, fill: { color: colCard } 
          });
       }
    }

    // B. Content Slides (Split into chunks for readability)
    const chunkSize = 3;
    for (let i = 0; i < section.content.length; i += chunkSize) {
      const chunk = section.content.slice(i, i + chunkSize);
      let contentSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
      
      // Header
      contentSlide.addText(section.topic, { 
        x: 0.5, y: 0.3, w: "80%", fontSize: 16, color: colSubtext, fontFace: "Arial" 
      });
      contentSlide.addShape(pres.ShapeType.line, { 
        x: 0.5, y: 0.75, w: "90%", h: 0, line: { color: colSecondary, width: 2 } 
      });

      // Column Headers
      contentSlide.addText("English Notes", { 
        x: 0.5, y: 1.0, w: 4.5, fontSize: 14, bold: true, color: colPrimary, fontFace: "Arial" 
      });
      contentSlide.addText("中文解析 (Chinese)", { 
        x: 5.2, y: 1.0, w: 4.5, fontSize: 14, bold: true, color: colPrimary, fontFace: "Microsoft YaHei" 
      });

      // Content Rows
      let currentY = 1.5;
      chunk.forEach((point) => {
        const enText = point.keyTerm ? `[${point.keyTerm}] ${point.english}` : point.english;
        // Strip basic markdown
        const cleanEn = enText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`(.*?)`/g, "$1");
        const cleanCn = point.chinese.replace(/\*\*/g, "").replace(/`/g, "");

        // Determine height based on length roughly
        const heightEst = Math.max(cleanEn.length, cleanCn.length) > 150 ? 1.5 : 1.2;

        // English Column (Plain)
        contentSlide.addText(cleanEn, { 
          x: 0.5, y: currentY, w: 4.5, h: heightEst, fontSize: 12, color: colText, valign: "top", fontFace: "Arial", bullet: true
        });
        
        // Chinese Column (Card/Box Style)
        contentSlide.addShape(pres.ShapeType.rect, {
            x: 5.1, y: currentY, w: 4.6, h: heightEst, fill: { color: colSecondary, transparency: 70 }, line: { color: colSecondary, width: 1 }
        });
        contentSlide.addText(cleanCn, { 
          x: 5.2, y: currentY + 0.1, w: 4.4, h: heightEst - 0.2, fontSize: 12, color: colText, valign: "top", fontFace: "Microsoft YaHei" 
        });
        
        currentY += heightEst + 0.1; 
      });
    }
  }

  await pres.writeFile({ fileName: `${cleanName}_StudyGuide.pptx` });
};

// Helper to hex
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const exportToPdf = async (fileName: string, theme: AppTheme = THEMES[0]) => {
   if (!window.jspdf || !window.html2canvas) {
    throw new Error("PDF generator not loaded");
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  
  // Title Page
  const bgRgb = hexToRgb(theme.colors.bg);
  if(bgRgb) doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
  else doc.setFillColor(240, 249, 255);
  
  doc.rect(0, 0, pdfWidth, pdfHeight, 'F');
  
  doc.setFontSize(28);
  
  const primRgb = hexToRgb(theme.colors.primary);
  if(primRgb) doc.setTextColor(primRgb.r, primRgb.g, primRgb.b);
  else doc.setTextColor(2, 132, 199);

  doc.text("Bilingual Study Guide", pdfWidth / 2, 80, { align: 'center' });
  
  doc.setFontSize(14);
  const textRgb = hexToRgb(theme.colors.subtext);
  if(textRgb) doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  else doc.setTextColor(100, 116, 139);

  doc.text(`Source: ${fileName}`, pdfWidth / 2, 95, { align: 'center' });

  doc.setFontSize(10);
  doc.text("Generated by Bilingual Scholar", pdfWidth / 2, 280, { align: 'center' });

  let currentY = 15;
  doc.addPage();
  
  // Page Background for content pages
  if(bgRgb) doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
  doc.rect(0,0, pdfWidth, pdfHeight, 'F');

  // Capture Sections
  const elements = document.getElementsByClassName('study-section-export');
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    
    // Improved scaling logic for professional PDF look
    // High res (scale 2) for standard size, reduced for massive elements to avoid browser crash
    let scale = 2; 
    const elHeight = element.offsetHeight;
    if (elHeight > 1500) scale = 1.5;
    if (elHeight > 3000) scale = 1;

    // Use JPEG instead of PNG for massive space savings
    const canvas = await window.html2canvas(element, { 
        scale: scale, 
        useCORS: true,
        backgroundColor: theme.colors.card,
        logging: false
    });
    
    // Quality 0.85 balances sharpness and file size
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const imgProps = doc.getImageProperties(imgData);
    
    // Calculate aspect ratio to fit width
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // Logic to handle page breaks
    if (currentY + imgHeight > pdfHeight - margin) {
      doc.addPage();
      if(bgRgb) doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
      doc.rect(0,0, pdfWidth, pdfHeight, 'F');
      currentY = margin;
    }

    doc.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);
    
    // Add padding after image
    currentY += imgHeight + 10;
  }

  doc.save(`${fileName.replace(/\.[^/.]+$/, "")}_StudyGuide.pdf`);
};
