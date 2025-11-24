import { ParsedResult } from "../types";

// We rely on the global window objects for these libraries to avoid bundler complexity.

export const extractTextFromFile = async (file: File): Promise<ParsedResult> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractPdfText(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.pptx')
  ) {
    return extractPptxText(file);
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or PPTX.');
  }
};

const extractPdfText = async (file: File): Promise<ParsedResult> => {
  const arrayBuffer = await file.arrayBuffer();
  
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded.");
  }

  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  // PDF Image extraction is complex in browser-only env without heavy deps. 
  // Returning empty map for now.
  const imageMap: Record<number, string[]> = {}; 

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return { text: fullText, imageMap };
};

const extractPptxText = async (file: File): Promise<ParsedResult> => {
  if (!window.JSZip) {
    throw new Error("JSZip library not loaded.");
  }

  const zip = new window.JSZip();
  const content = await zip.loadAsync(file);
  
  const slideFiles: string[] = [];
  const imageMap: Record<number, string[]> = {};
  
  // 1. Identify slide XML files
  Object.keys(content.files).forEach((filename) => {
    if (filename.match(/ppt\/slides\/slide\d+\.xml/)) {
      slideFiles.push(filename);
    }
  });

  // 2. Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
    return numA - numB;
  });

  let fullText = "";

  // 3. Process each slide for Text AND Images
  for (const filename of slideFiles) {
    const slideIndex = parseInt(filename.match(/slide(\d+)\.xml/)![1]);
    
    // A. Text Extraction
    const slideXml = await content.files[filename].async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(slideXml, "application/xml");
    
    const textNodes = xmlDoc.getElementsByTagName("a:t");
    let slideText = "";
    for (let i = 0; i < textNodes.length; i++) {
      slideText += textNodes[i].textContent + " ";
    }
    
    fullText += `--- Slide ${slideIndex} ---\n${slideText}\n\n`;

    // B. Image Extraction via Relationships
    // The relationships file is at ppt/slides/_rels/slideX.xml.rels
    const relsFileName = filename.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relsFile = content.files[relsFileName];

    if (relsFile) {
      const relsXml = await relsFile.async("string");
      const relsDoc = parser.parseFromString(relsXml, "application/xml");
      const relationships = relsDoc.getElementsByTagName("Relationship");

      imageMap[slideIndex] = [];

      for (let i = 0; i < relationships.length; i++) {
        const type = relationships[i].getAttribute("Type");
        const target = relationships[i].getAttribute("Target");
        
        // Check if it is an image relationship
        if (type && type.includes("/image") && target) {
          // Target is usually like "../media/image1.png"
          // We need to resolve this path relative to the zip root
          const cleanTarget = target.replace('../', 'ppt/');
          const imageFile = content.files[cleanTarget];
          
          if (imageFile) {
            const imgBlob = await imageFile.async("blob");
            const imgUrl = URL.createObjectURL(imgBlob);
            imageMap[slideIndex].push(imgUrl);
          }
        }
      }
    }
  }

  return { text: fullText, imageMap };
};
