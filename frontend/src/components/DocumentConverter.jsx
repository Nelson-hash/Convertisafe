import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Download, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { pdfConverter } from '../services/pdfConverter';

const DocumentConverter = () => {
  const [file, setFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [convertedImages, setConvertedImages] = useState([]);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await processFileSelection(droppedFile);
    }
  }, []);

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await processFileSelection(selectedFile);
    }
  };

  const processFileSelection = async (selectedFile) => {
    try {
      // Validate file first
      pdfConverter.validateFile(selectedFile);
      
      setFile(selectedFile);
      setConvertedImages([]);
      setPdfInfo(null);
      
      // Get PDF info
      const info = await pdfConverter.getPDFInfo(selectedFile);
      setPdfInfo(info);
      
      toast({
        title: "PDF loaded successfully",
        description: `${selectedFile.name} (${info.numPages} page${info.numPages > 1 ? 's' : ''})`,
      });
    } catch (error) {
      toast({
        title: "Invalid file",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setProgress(0);
    setProgressMessage('');
    
    try {
      const images = await pdfConverter.convertToImages(
        file, 
        outputFormat, 
        (progressValue, message) => {
          setProgress(progressValue);
          setProgressMessage(message);
        },
        {
          scale: 2, // High quality
          quality: 0.95
        }
      );
      
      setConvertedImages(images);
      toast({
        title: "Conversion complete!",
        description: `Generated ${images.length} image${images.length > 1 ? 's' : ''} from your PDF`,
      });
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `Downloading ${image.name}`,
    });
  };

  const handleDownloadAll = () => {
    convertedImages.forEach((image, index) => {
      setTimeout(() => {
        handleDownload(image);
      }, index * 100); // Stagger downloads
    });
    
    toast({
      title: "Downloading all images",
      description: `Starting download of ${convertedImages.length} files`,
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Document Converter
          </h1>
          <p className="text-xl text-slate-600 mb-6">
            Convert your PDF files to high-quality images instantly
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Your files never leave this browser</span>
          </div>
        </div>

        <div className="grid gap-8">
          {/* Upload Section */}
          <Card className="p-8 border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
            <div
              className={`relative ${dragActive ? 'scale-105' : ''} transition-transform duration-200`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                id="file-upload"
                disabled={isConverting}
              />
              <div className="text-center py-12">
                <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-slate-400'} transition-colors`} />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-slate-600 mb-4">
                  or click to browse your files
                </p>
                <Button variant="outline" className="bg-white hover:bg-slate-50" disabled={isConverting}>
                  Choose PDF File
                </Button>
              </div>
            </div>
          </Card>

          {/* PDF Info & Controls */}
          {file && pdfInfo && (
            <Card className="p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">{file.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {pdfInfo.numPages} page{pdfInfo.numPages > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  PDF Ready
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Convert to
                  </label>
                  <Select value={outputFormat} onValueChange={setOutputFormat} disabled={isConverting}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          PNG Image (Best quality)
                        </div>
                      </SelectItem>
                      <SelectItem value="jpg">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          JPG Image (Smaller size)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleConvert} 
                  disabled={isConverting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isConverting ? 'Converting...' : 'Convert to Images'}
                </Button>
              </div>

              {isConverting && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">{progressMessage}</span>
                    <span className="text-sm text-slate-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </Card>
          )}

          {/* Converted Images */}
          {convertedImages.length > 0 && (
            <Card className="p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Conversion Complete!</h4>
                    <p className="text-sm text-slate-600">
                      {convertedImages.length} image{convertedImages.length > 1 ? 's' : ''} ready for download
                    </p>
                  </div>
                </div>
                {convertedImages.length > 1 && (
                  <Button 
                    onClick={handleDownloadAll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </Button>
                )}
              </div>

              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {convertedImages.map((image, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                        <Image className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-slate-900">{image.name}</h5>
                        <p className="text-xs text-slate-600">
                          {formatFileSize(image.size)} • {image.width}×{image.height}px
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleDownload(image)}
                      className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Privacy Features */}
          <Card className="p-6 bg-slate-900 text-white">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold mb-2">100% Private & Secure</h3>
              <p className="text-slate-300 mb-4">
                Your files are processed entirely in your browser using advanced WebAssembly technology. No uploads, no servers, no data collection.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  No file uploads
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Works offline
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Client-side processing
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentConverter;