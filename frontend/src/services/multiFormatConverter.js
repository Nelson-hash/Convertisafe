import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

/**
 * Multi-Format Converter Service
 * Handles conversion between various file formats
 */
export class MultiFormatConverter {
  constructor() {
    this.isProcessing = false;
    this.supportedFormats = {
      input: ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp', 'gif'],
      output: ['pdf', 'png', 'jpg', 'jpeg', 'webp']
    };
  }

  /**
   * Get supported conversion routes
   */
  getSupportedConversions() {
    return {
      'pdf': ['png', 'jpg', 'jpeg'],
      'docx': ['pdf', 'png', 'jpg'],
      'doc': ['pdf', 'png', 'jpg'],
      'png': ['pdf', 'jpg', 'jpeg', 'webp'],
      'jpg': ['pdf', 'png', 'webp'],
      'jpeg': ['pdf', 'png', 'webp'],
      'webp': ['pdf', 'png', 'jpg'],
      'gif': ['pdf', 'png', 'jpg'],
      'multiple_images': ['pdf']
    };
  }

  /**
   * Detect file type from file object
   */
  getFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeTypes = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return mimeTypes[file.type] || extension;
  }

  /**
   * Main conversion dispatcher
   */
  async convertFile(file, outputFormat, onProgress, options = {}) {
    if (this.isProcessing) {
      throw new Error('Conversion already in progress');
    }

    this.isProcessing = true;
    
    try {
      const inputFormat = this.getFileType(file);
      onProgress && onProgress(5, `Detecting file type: ${inputFormat.toUpperCase()}`);

      // Validate conversion route
      const supportedOutputs = this.getSupportedConversions()[inputFormat];
      if (!supportedOutputs || !supportedOutputs.includes(outputFormat)) {
        throw new Error(`Conversion from ${inputFormat.toUpperCase()} to ${outputFormat.toUpperCase()} is not supported`);
      }

      onProgress && onProgress(10, 'Starting conversion...');

      let result;
      
      // Route to appropriate converter
      switch (inputFormat) {
        case 'pdf':
          result = await this.convertPDFToImage(file, outputFormat, onProgress, options);
          break;
        case 'docx':
        case 'doc':
          result = await this.convertWordToPDF(file, outputFormat, onProgress, options);
          break;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'webp':
        case 'gif':
          result = await this.convertImage(file, outputFormat, onProgress, options);
          break;
        default:
          throw new Error(`Unsupported input format: ${inputFormat}`);
      }

      onProgress && onProgress(100, 'Conversion complete!');
      return result;

    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Convert multiple images to PDF
   */
  async convertImagesToPDF(files, onProgress, options = {}) {
    if (this.isProcessing) {
      throw new Error('Conversion already in progress');
    }

    this.isProcessing = true;

    try {
      onProgress && onProgress(5, `Processing ${files.length} images...`);

      const pdfDoc = await PDFDocument.create();
      const pageSize = options.pageSize || 'A4';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = 5 + (80 * (i + 1)) / files.length;
        onProgress && onProgress(Math.floor(progress), `Adding image ${i + 1}/${files.length}`);

        const imageBytes = await this.readFileAsArrayBuffer(file);
        const fileType = this.getFileType(file);
        
        let image;
        switch (fileType) {
          case 'png':
            image = await pdfDoc.embedPng(imageBytes);
            break;
          case 'jpg':
          case 'jpeg':
            image = await pdfDoc.embedJpg(imageBytes);
            break;
          default:
            // Convert other formats to PNG first
            const canvas = await this.loadImageToCanvas(file);
            const pngDataUrl = canvas.toDataURL('image/png');
            const pngBytes = this.dataURLToArrayBuffer(pngDataUrl);
            image = await pdfDoc.embedPng(pngBytes);
        }

        const page = pdfDoc.addPage();
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Scale image to fit page while maintaining aspect ratio
        const imageAspectRatio = image.width / image.height;
        const pageAspectRatio = pageWidth / pageHeight;
        
        let drawWidth, drawHeight;
        if (imageAspectRatio > pageAspectRatio) {
          drawWidth = pageWidth * 0.9; // 90% of page width
          drawHeight = drawWidth / imageAspectRatio;
        } else {
          drawHeight = pageHeight * 0.9; // 90% of page height
          drawWidth = drawHeight * imageAspectRatio;
        }

        page.drawImage(image, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }

      onProgress && onProgress(90, 'Finalizing PDF...');
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const fileName = `converted_images_${Date.now()}.pdf`;
      
      return [{
        name: fileName,
        url: URL.createObjectURL(blob),
        blob: blob,
        size: blob.size,
        type: 'application/pdf',
        pages: files.length
      }];

    } catch (error) {
      throw new Error(`Images to PDF conversion failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Convert PDF to images (existing functionality)
   */
  async convertPDFToImage(file, outputFormat, onProgress, options = {}) {
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;

    const images = [];
    const totalPages = pdf.numPages;
    const scale = options.scale || 2;
    const quality = options.quality || 0.95;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const progress = 20 + (60 * pageNumber) / totalPages;
      onProgress && onProgress(Math.floor(progress), `Converting page ${pageNumber}/${totalPages}...`);

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : `image/${outputFormat}`;
      const imageDataUrl = canvas.toDataURL(mimeType, quality);
      const blob = await this.dataURLToBlob(imageDataUrl);

      const baseName = file.name.replace('.pdf', '');
      const fileName = totalPages > 1 
        ? `${baseName}_page_${pageNumber}.${outputFormat}`
        : `${baseName}.${outputFormat}`;

      images.push({
        name: fileName,
        url: URL.createObjectURL(blob),
        blob: blob,
        size: blob.size,
        type: mimeType,
        page: pageNumber,
        width: viewport.width,
        height: viewport.height
      });
    }

    await pdf.destroy();
    return images;
  }

  /**
   * Convert Word document to PDF or images
   */
  async convertWordToPDF(file, outputFormat, onProgress, options = {}) {
    onProgress && onProgress(20, 'Reading Word document...');
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    
    onProgress && onProgress(40, 'Converting to HTML...');
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;

    if (!htmlContent.trim()) {
      throw new Error('No content found in Word document');
    }

    onProgress && onProgress(60, 'Generating PDF...');

    // Create a temporary element for conversion
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.padding = '20mm';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '1.4';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const opt = {
        margin: 10,
        filename: `${file.name.replace(/\.(docx|doc)$/i, '')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      onProgress && onProgress(80, 'Finalizing conversion...');
      
      const pdfBlob = await html2pdf().from(tempDiv).set(opt).outputPdf('blob');
      
      const baseName = file.name.replace(/\.(docx|doc)$/i, '');
      const fileName = `${baseName}.pdf`;

      const result = [{
        name: fileName,
        url: URL.createObjectURL(pdfBlob),
        blob: pdfBlob,
        size: pdfBlob.size,
        type: 'application/pdf',
        originalFormat: 'docx'
      }];

      // If output format is image, convert PDF to image
      if (outputFormat !== 'pdf') {
        onProgress && onProgress(90, 'Converting to image...');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        return await this.convertPDFToImage(pdfFile, outputFormat, null, options);
      }

      return result;

    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  /**
   * Convert between image formats
   */
  async convertImage(file, outputFormat, onProgress, options = {}) {
    onProgress && onProgress(20, 'Loading image...');
    
    if (outputFormat === 'pdf') {
      return await this.convertImagesToPDF([file], onProgress, options);
    }

    const canvas = await this.loadImageToCanvas(file);
    onProgress && onProgress(60, 'Converting format...');

    const quality = options.quality || 0.95;
    const mimeType = `image/${outputFormat}`;
    const dataURL = canvas.toDataURL(mimeType, quality);
    
    onProgress && onProgress(80, 'Finalizing...');
    
    const blob = await this.dataURLToBlob(dataURL);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}.${outputFormat}`;

    return [{
      name: fileName,
      url: URL.createObjectURL(blob),
      blob: blob,
      size: blob.size,
      type: mimeType,
      width: canvas.width,
      height: canvas.height,
      originalFormat: this.getFileType(file)
    }];
  }

  /**
   * Helper: Load image to canvas
   */
  loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Helper: Read file as ArrayBuffer
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Helper: Convert data URL to Blob
   */
  async dataURLToBlob(dataURL) {
    const response = await fetch(dataURL);
    return response.blob();
  }

  /**
   * Helper: Convert data URL to ArrayBuffer
   */
  dataURLToArrayBuffer(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Validate file for conversion
   */
  validateFile(file, targetFormat = null) {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileType = this.getFileType(file);
    
    if (!this.supportedFormats.input.includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType.toUpperCase()}`);
    }

    if (targetFormat) {
      const supportedOutputs = this.getSupportedConversions()[fileType];
      if (!supportedOutputs || !supportedOutputs.includes(targetFormat)) {
        throw new Error(`Cannot convert ${fileType.toUpperCase()} to ${targetFormat.toUpperCase()}`);
      }
    }

    // File size limits (adjust as needed)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    if (file.size === 0) {
      throw new Error('File appears to be empty');
    }

    return true;
  }

  /**
   * Cancel ongoing conversion
   */
  cancel() {
    this.isProcessing = false;
  }
}

// Export singleton instance
export const multiFormatConverter = new MultiFormatConverter();