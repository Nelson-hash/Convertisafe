import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Download, Shield, CheckCircle, AlertCircle, Info, FileImage, FilePlus2, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import { multiFormatConverter } from '../services/multiFormatConverter';

const EnhancedDocumentConverter = () => {
  const [files, setFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [conversionMode, setConversionMode] = useState('single'); // 'single' or 'batch'
  const { toast } = useToast();

  const supportedFormats = {
    input: ['PDF', 'DOCX', 'DOC', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'],
    output: ['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP']
  };

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
    
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await processFileSelection(droppedFiles);
    }
  }, [conversionMode]);

  const handleFileSelect = async (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await processFileSelection(selectedFiles);
    }
  };

  const processFileSelection = async (selectedFiles) => {
    try {
      const validFiles = [];
      const errors = [];

      for (const file of selectedFiles) {
        try {
          multiFormatConverter.validateFile(file);
          
          const fileInfo = {
            file,
            name: file.name,
            size: file.size,
            type: multiFormatConverter.getFileType(file),
            id: Date.now() + Math.random(),
            supportedOutputs: multiFormatConverter.getSupportedConversions()[multiFormatConverter.getFileType(file)] || []
          };
          
          validFiles.push(fileInfo);
        } catch (error) {
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      if (conversionMode === 'single' && validFiles.length > 1) {
        // In single mode, only take the first file
        setFiles([validFiles[0]]);
        if (validFiles.length > 1) {
          toast({
            title: "Single file mode",
            description: `Only ${validFiles[0].name} was loaded. Switch to batch mode for multiple files.`,
          });
        }
      } else {
        setFiles(conversionMode === 'single' ? validFiles.slice(0, 1) : validFiles);
      }

      setConvertedFiles([]);

      if (errors.length > 0) {
        toast({
          title: "Some files couldn't be loaded",
          description: errors.join(', '),
          variant: "destructive"
        });
      }

      if (validFiles.length > 0) {
        toast({
          title: "Files loaded successfully",
          description: `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} ready for conversion`,
        });
      }

    } catch (error) {
      toast({
        title: "Error processing files",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const getAvailableOutputFormats = () => {
    if (files.length === 0) return [];
    
    if (conversionMode === 'batch' && files.length > 1) {
      // For batch mode with multiple files, check if all are images for PDF conversion
      const allImages = files.every(f => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f.type));
      if (allImages) {
        return ['pdf']; // Multiple images can only convert to PDF
      }
      // For mixed file types in batch, find common output formats
      return files.reduce((common, file) => {
        return common.filter(format => file.supportedOutputs.includes(format));
      }, supportedFormats.output.map(f => f.toLowerCase()));
    }
    
    // Single file mode
    return files[0]?.supportedOutputs || [];
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    setProgress(0);
    setProgressMessage('');
    
    try {
      let results = [];

      if (conversionMode === 'batch' && files.length > 1) {
        // Check if converting multiple images to PDF
        const allImages = files.every(f => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f.type));
        
        if (allImages && outputFormat === 'pdf') {
          // Convert multiple images to single PDF
          const fileObjects = files.map(f => f.file);
          results = await multiFormatConverter.convertImagesToPDF(
            fileObjects,
            (progressValue, message) => {
              setProgress(progressValue);
              setProgressMessage(message);
            }
          );
        } else {
          // Convert each file individually
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileResults = await multiFormatConverter.convertFile(
              file.file,
              outputFormat,
              (progressValue, message) => {
                const overallProgress = ((i / files.length) * 90) + (progressValue * 0.9);
                setProgress(Math.floor(overallProgress));
                setProgressMessage(`File ${i + 1}/${files.length}: ${message}`);
              }
            );
            results.push(...fileResults);
          }
        }
      } else {
        // Single file conversion
        results = await multiFormatConverter.convertFile(
          files[0].file,
          outputFormat,
          (progressValue, message) => {
            setProgress(progressValue);
            setProgressMessage(message);
          }
        );
      }
      
      setConvertedFiles(results);
      toast({
        title: "Conversion complete!",
        description: `Generated ${results.length} file${results.length > 1 ? 's' : ''}`,
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

  const handleDownload = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `Downloading ${file.name}`,
    });
  };

  const handleDownloadAll = () => {
    convertedFiles.forEach((file, index) => {
      setTimeout(() => {
        handleDownload(file);
      }, index * 100);
    });
    
    toast({
      title: "Downloading all files",
      description: `Starting download of ${convertedFiles.length} files`,
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-600" />;
      case 'docx':
      case 'doc': return <FileText className="w-6 h-6 text-blue-600" />;
      default: return <Image className="w-6 h-6 text-green-600" />;
    }
  };

  const availableOutputFormats = getAvailableOutputFormats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            ConvertSafe Pro
          </h1>
          <p className="text-xl text-slate-600 mb-6">
            Convert between PDF, Word, and Image formats instantly
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Your files never leave this browser</span>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-8">
          <Tabs value={conversionMode} onValueChange={setConversionMode} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                Single File
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <FilePlus2 className="w-4 h-4" />
                Batch Convert
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.gif"
                onChange={handleFileSelect}
                multiple={conversionMode === 'batch'}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isConverting}
              />
              <div className="text-center py-12">
                <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-slate-400'} transition-colors`} />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Drop your files here
                </h3>
                <p className="text-slate-600 mb-4">
                  {conversionMode === 'single' 
                    ? 'or click to browse your files'
                    : 'or click to browse multiple files'
                  }
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-slate-500">
                  {supportedFormats.input.map(format => (
                    <Badge key={format} variant="outline" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" className="bg-white hover:bg-slate-50" disabled={isConverting}>
                  Choose Files
                </Button>
              </div>
            </div>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card className="p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900">
                  Selected Files ({files.length})
                </h4>
                {conversionMode === 'batch' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiles([])}
                    className="text-slate-600"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {files.map((fileInfo) => (
                  <div key={fileInfo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(fileInfo.type)}
                      <div>
                        <h5 className="font-medium text-slate-900">{fileInfo.name}</h5>
                        <p className="text-xs text-slate-600">
                          {formatFileSize(fileInfo.size)} • {fileInfo.type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileInfo.id)}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Conversion Controls */}
              <div className="grid md:grid-cols-2 gap-6 items-end mt-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Convert to
                  </label>
                  <Select 
                    value={outputFormat} 
                    onValueChange={setOutputFormat} 
                    disabled={isConverting || availableOutputFormats.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOutputFormats.map(format => (
                        <SelectItem key={format} value={format}>
                          <div className="flex items-center gap-2">
                            {format === 'pdf' ? <FileText className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                            {format.toUpperCase()} 
                            {format === 'png' && ' (Best quality)'}
                            {format === 'jpg' && ' (Smaller size)'}
                            {format === 'pdf' && ' (Document)'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableOutputFormats.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      No compatible output formats available
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleConvert} 
                  disabled={isConverting || availableOutputFormats.length === 0 || !outputFormat}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isConverting ? 'Converting...' : `Convert ${files.length} File${files.length > 1 ? 's' : ''}`}
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

          {/* Converted Files */}
          {convertedFiles.length > 0 && (
            <Card className="p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Conversion Complete!</h4>
                    <p className="text-sm text-slate-600">
                      {convertedFiles.length} file{convertedFiles.length > 1 ? 's' : ''} ready for download
                    </p>
                  </div>
                </div>
                {convertedFiles.length > 1 && (
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
                {convertedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-6 h-6 text-slate-600" />
                        ) : (
                          <FileText className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-medium text-slate-900">{file.name}</h5>
                        <p className="text-xs text-slate-600">
                          {formatFileSize(file.size)}
                          {file.width && file.height && ` • ${file.width}×${file.height}px`}
                          {file.pages && ` • ${file.pages} page${file.pages > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleDownload(file)}
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
                All conversions happen in your browser using advanced WebAssembly technology. 
                No uploads, no servers, no data collection.
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
                <div className="flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Multiple formats
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDocumentConverter;