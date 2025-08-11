import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local worker file to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

/**
 * PDF to Image Converter Service
 * Handles client-side PDF conversion using PDF.js
 */
export class PDFConverter {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Convert PDF file to images
   * @param {File} file - PDF file to convert
   * @param {string} outputFormat - Output format (png, jpg)
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Conversion options
   * @returns {Promise<Array>} Array of converted image objects
   */
  async convertToImages(file, outputFormat = 'png', onProgress, options = {}) {
    if (this.isProcessing) {
      throw new Error('Conversion already in progress');
    }

    this.isProcessing = true;
    const images = [];

    try {
      // Validate file
      this.validateFile(file);

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Load PDF document
      onProgress && onProgress(10, 'Loading PDF...');
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;

      const totalPages = pdf.numPages;
      const scale = options.scale || 2; // Higher scale for better quality
      const quality = options.quality || 0.95;

      onProgress && onProgress(20, `Processing ${totalPages} page(s)...`);

      // Convert each page
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        
        // Calculate progress
        const pageProgress = 20 + (60 * (pageNumber - 1)) / totalPages;
        onProgress && onProgress(Math.floor(pageProgress), `Converting page ${pageNumber}/${totalPages}...`);

        // Get viewport and create canvas
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // Convert canvas to image data
        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
        const imageDataUrl = canvas.toDataURL(mimeType, quality);
        
        // Create blob for download
        const blob = await this.dataURLToBlob(imageDataUrl);
        const imageUrl = URL.createObjectURL(blob);

        // Generate filename
        const baseName = file.name.replace('.pdf', '');
        const fileName = totalPages > 1 
          ? `${baseName}_page_${pageNumber}.${outputFormat}`
          : `${baseName}.${outputFormat}`;

        images.push({
          name: fileName,
          url: imageUrl,
          blob: blob,
          size: blob.size,
          type: mimeType,
          page: pageNumber,
          width: viewport.width,
          height: viewport.height
        });
      }

      onProgress && onProgress(90, 'Finalizing conversion...');
      
      // Cleanup
      await pdf.destroy();
      
      onProgress && onProgress(100, 'Conversion complete!');
      
      return images;

    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Validate PDF file
   * @param {File} file - File to validate
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.type !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 100MB');
    }

    if (file.size === 0) {
      throw new Error('File appears to be empty');
    }
  }

  /**
   * Read file as ArrayBuffer
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>}
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert data URL to Blob
   * @param {string} dataURL - Data URL to convert
   * @returns {Promise<Blob>}
   */
  async dataURLToBlob(dataURL) {
    const response = await fetch(dataURL);
    return response.blob();
  }

  /**
   * Get PDF information without converting
   * @param {File} file - PDF file
   * @returns {Promise<Object>} PDF information
   */
  async getPDFInfo(file) {
    try {
      this.validateFile(file);
      
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      
      const info = {
        numPages: pdf.numPages,
        fingerprint: pdf.fingerprint,
        title: '',
        author: '',
        creator: '',
        producer: ''
      };

      // Get metadata if available
      try {
        const metadata = await pdf.getMetadata();
        if (metadata.info) {
          info.title = metadata.info.Title || '';
          info.author = metadata.info.Author || '';
          info.creator = metadata.info.Creator || '';
          info.producer = metadata.info.Producer || '';
        }
      } catch (metaError) {
        // Metadata not available, continue without it
      }

      await pdf.destroy();
      return info;

    } catch (error) {
      throw new Error(`Failed to get PDF info: ${error.message}`);
    }
  }

  /**
   * Cancel ongoing conversion
   */
  cancel() {
    this.isProcessing = false;
  }
}

// Export singleton instance
export const pdfConverter = new PDFConverter();