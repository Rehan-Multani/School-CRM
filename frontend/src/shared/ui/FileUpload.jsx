import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, Video } from 'lucide-react';
import { cn } from '../lib/cn';

// Canonical FileUpload — identical between teacher and parent aside from
// an unused per-module `id` attribute (verified via repo-wide grep), now
// an optional prop.
export const FileUpload = ({ onFilesChange, accept = '*', maxFiles = 5, label = 'Upload Files', className, id }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef();

  const getFileIcon = (type) => {
    if (type.startsWith('image')) return <Image className="w-4 h-4 text-purple-500" />;
    if (type.startsWith('video')) return <Video className="w-4 h-4 text-rose-500" />;
    return <FileText className="w-4 h-4 text-primary" />;
  };

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles).slice(0, maxFiles - files.length);
    const updated = [...files, ...arr].slice(0, maxFiles);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
        )}
      >
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <Upload className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Drag & drop or click to browse</p>
          {maxFiles > 1 && <p className="text-[10px] text-slate-400">Up to {maxFiles} files</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        id={id}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
