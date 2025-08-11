# Document Converter - Integration Contracts

## API Contracts

### 1. File Upload Endpoint
- **Endpoint**: `POST /api/upload`
- **Purpose**: Handle file upload and validation
- **Input**: Multipart form data with PDF file
- **Output**: File metadata and upload confirmation
- **Mock Data**: Currently using browser File API for local processing

### 2. Conversion Endpoint
- **Endpoint**: `POST /api/convert`
- **Purpose**: Convert PDF to image format
- **Input**: File ID, output format (png/jpg)
- **Output**: Converted file URL or base64 data
- **Mock Data**: Using `mockConversion.js` with simulated progress

### 3. Download Endpoint
- **Endpoint**: `GET /api/download/{file_id}`
- **Purpose**: Serve converted files
- **Output**: File stream with appropriate headers
- **Mock Data**: Using blob URLs with sample image data

## Mock Data Currently Used

### In `mockConversion.js`:
- Simulated conversion progress (0-100%)
- Mock file size calculation (80% of original)
- Sample base64 image data for PNG/JPG
- Realistic conversion timing (2-3 seconds)

### In `DocumentConverter.jsx`:
- File validation (PDF only, 100MB max)
- Progress tracking during conversion
- Download simulation with blob URLs

## Backend Implementation Plan

### 1. File Processing
- **Library**: WebAssembly-based PDF processing (pdf-lib or similar)
- **Storage**: Temporary local storage, no server uploads
- **Processing**: Client-side conversion using WASM

### 2. Supported Conversions
- **Phase 1**: PDF → PNG/JPG (current focus)
- **Phase 2**: Add PDF → multiple images (page-by-page)
- **Phase 3**: Additional formats (WEBP, TIFF)

### 3. WebAssembly Integration
- **PDF-lib**: For PDF parsing and manipulation
- **Canvas API**: For rendering PDF pages to images
- **ImageMagick WASM**: Alternative for advanced image processing

## Frontend-Backend Integration

### Replace Mock Functions:
1. **mockConversion()** → Real WASM-based conversion
2. **File validation** → Enhanced type and size checking
3. **Progress tracking** → Actual conversion progress
4. **Download handling** → Direct blob generation from WASM

### Key Integration Points:
- Remove mock delays and use real processing time
- Replace sample image data with actual converted images
- Implement proper error handling for WASM operations
- Add support for multi-page PDF conversion

### Error Handling:
- File corruption detection
- Memory limitations for large files
- Conversion timeout handling
- Format-specific error messages

## Privacy & Security Features
- All processing happens client-side
- No file uploads to servers
- No data persistence beyond browser session
- Clear privacy messaging throughout UI