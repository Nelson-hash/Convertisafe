// Mock conversion functionality to simulate PDF to image conversion
export const mockConversion = async (file, outputFormat, onProgress) => {
  return new Promise((resolve) => {
    let progress = 0;
    
    const updateProgress = () => {
      progress += Math.random() * 25;
      if (progress > 100) progress = 100;
      
      onProgress(Math.floor(progress));
      
      if (progress < 100) {
        setTimeout(updateProgress, 200 + Math.random() * 300);
      } else {
        // Simulate conversion complete
        setTimeout(() => {
          const fileName = file.name.replace('.pdf', `.${outputFormat}`);
          const mockSize = Math.floor(file.size * 0.8); // Assume converted file is 80% of original
          
          // Create a simple mock file blob (1x1 pixel image)
          const mockImageData = outputFormat === 'png' 
            ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            : 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
          
          resolve({
            name: fileName,
            size: mockSize,
            url: mockImageData,
            type: `image/${outputFormat}`,
            originalFile: file.name
          });
        }, 500);
      }
    };
    
    updateProgress();
  });
};

// Mock function to simulate supported formats
export const getSupportedFormats = () => {
  return {
    input: ['pdf'],
    output: ['png', 'jpg', 'jpeg']
  };
};

// Mock function to validate file
export const validateFile = (file) => {
  const maxSize = 100 * 1024 * 1024; // 100MB max
  const supportedTypes = ['application/pdf'];
  
  if (!supportedTypes.includes(file.type)) {
    throw new Error('Unsupported file type. Please select a PDF file.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 100MB.');
  }
  
  return true;
};