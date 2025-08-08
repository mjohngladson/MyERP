import React, { useState, useCallback } from 'react';
import { 
  Upload, File, Image, FileText, Download, Trash2, 
  Eye, Share2, FolderPlus, Search, Grid, List, 
  ChevronLeft, MoreVertical, Calendar, User
} from 'lucide-react';

const FileManager = ({ onBack }) => {
  const [files, setFiles] = useState([
    {
      id: '1',
      name: 'Sales_Report_Q1_2024.pdf',
      type: 'pdf',
      size: '2.4 MB',
      uploadedBy: 'John Doe',
      uploadedAt: '2024-01-15T10:30:00Z',
      category: 'Reports',
      url: '#'
    },
    {
      id: '2',
      name: 'Customer_Database.xlsx',
      type: 'excel',
      size: '1.8 MB',
      uploadedBy: 'Jane Smith',
      uploadedAt: '2024-01-10T14:20:00Z',
      category: 'Data',
      url: '#'
    },
    {
      id: '3',
      name: 'Product_Images.zip',
      type: 'archive',
      size: '15.2 MB',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '2024-01-08T09:15:00Z',
      category: 'Assets',
      url: '#'
    },
    {
      id: '4',
      name: 'Invoice_Template.docx',
      type: 'word',
      size: '156 KB',
      uploadedBy: 'Sarah Wilson',
      uploadedAt: '2024-01-05T16:45:00Z',
      category: 'Templates',
      url: '#'
    }
  ]);

  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = ['all', 'Reports', 'Data', 'Assets', 'Templates', 'Documents'];

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <FileText className="text-red-500" size={24} />;
      case 'excel':
        return <FileText className="text-green-500" size={24} />;
      case 'word':
        return <FileText className="text-blue-500" size={24} />;
      case 'image':
        return <Image className="text-purple-500" size={24} />;
      case 'archive':
        return <File className="text-orange-500" size={24} />;
      default:
        return <File className="text-gray-500" size={24} />;
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (fileList) => {
    setUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      const newFiles = Array.from(fileList).map(file => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type.split('/')[1] || 'unknown',
        size: formatFileSize(file.size),
        uploadedBy: 'Current User',
        uploadedAt: new Date().toISOString(),
        category: 'Documents',
        url: URL.createObjectURL(file)
      }));

      setFiles(prev => [...newFiles, ...prev]);
      setUploading(false);
    }, 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFileAction = (action, fileId) => {
    const file = files.find(f => f.id === fileId);
    
    switch (action) {
      case 'download':
        // Simulate download
        console.log(`Downloading ${file.name}`);
        break;
      case 'delete':
        setFiles(prev => prev.filter(f => f.id !== fileId));
        break;
      case 'share':
        console.log(`Sharing ${file.name}`);
        break;
      case 'preview':
        console.log(`Previewing ${file.name}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">File Manager</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Uploading files...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-800 mb-2">
                Drop files here to upload
              </p>
              <p className="text-gray-600 mb-4">
                or click to browse your computer
              </p>
              <input
                type="file"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <Upload size={16} />
                <span>Choose Files</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* File Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">{files.length}</div>
          <div className="text-sm text-gray-600">Total Files</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">
            {files.reduce((total, file) => total + parseFloat(file.size), 0).toFixed(1)} MB
          </div>
          <div className="text-sm text-gray-600">Total Size</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">
            {new Set(files.map(f => f.category)).size}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">
            {files.filter(f => new Date(f.uploadedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-gray-600">This Week</div>
        </div>
      </div>

      {/* Files Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFiles.map(file => (
            <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                {getFileIcon(file.type)}
                <div className="relative">
                  <button className="p-1 hover:bg-gray-100 rounded-md">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 truncate" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{file.size}</p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{file.category}</span>
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFileAction('preview', file.id)}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Eye size={14} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleFileAction('download', file.id)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleFileAction('delete', file.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFiles.map(file => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <span className="font-medium text-gray-800">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {file.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{file.size}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-gray-600">{file.uploadedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-600">{formatDate(file.uploadedAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleFileAction('preview', file.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleFileAction('download', file.id)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleFileAction('share', file.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => handleFileAction('delete', file.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <File className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No files found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Upload some files to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileManager;