import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Download, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { mockConversion } from '../utils/mockConversion';

const DocumentConverter = () => {
  const [file, setFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState(null);
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setConvertedFile(null);
        toast({
          title: "File uploaded",
          description: `${droppedFile.name} is ready for conversion`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setConvertedFile(null);
        toast({
          title: "File selected",
          description: `${selectedFile.name} is ready for conversion`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive"
        });
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setProgress(0);
    
    try {
      // Mock conversion with progress updates
      const result = await mockConversion(file, outputFormat, (progressValue) => {
        setProgress(progressValue);
      });
      
      setConvertedFile(result);
      toast({
        title: "Conversion complete!",
        description: `Your PDF has been converted to ${outputFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: "Please try again with a different file",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (convertedFile) {
      const link = document.createElement('a');
      link.href = convertedFile.url;
      link.download = convertedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your converted file is downloading",
      });
    }
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
            Convert your PDF files to images instantly
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
              />
              <div className="text-center py-12">
                <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-slate-400'} transition-colors`} />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-slate-600 mb-4">
                  or click to browse your files
                </p>
                <Button variant="outline" className="bg-white hover:bg-slate-50">
                  Choose PDF File
                </Button>
              </div>
            </div>
          </Card>

          {/* File Info & Controls */}
          {file && (
            <Card className="p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">{file.name}</h4>
                    <p className="text-sm text-slate-600">{formatFileSize(file.size)}</p>
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
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          PNG Image
                        </div>
                      </SelectItem>
                      <SelectItem value="jpg">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          JPG Image
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
                  {isConverting ? 'Converting...' : 'Convert File'}
                </Button>
              </div>

              {isConverting && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Converting...</span>
                    <span className="text-sm text-slate-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </Card>
          )}

          {/* Download Section */}
          {convertedFile && (
            <Card className="p-6 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Conversion Complete!</h4>
                    <p className="text-sm text-slate-600">
                      {convertedFile.name} • {formatFileSize(convertedFile.size)}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </Card>
          )}

          {/* Privacy Features */}
          <Card className="p-6 bg-slate-900 text-white">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold mb-2">100% Private & Secure</h3>
              <p className="text-slate-300 mb-4">
                Your files are processed entirely in your browser. No uploads, no servers, no data collection.
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