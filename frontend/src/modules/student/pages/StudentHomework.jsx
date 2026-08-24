import React, { useState } from 'react';
import { useHomework } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  FileText, 
  Calendar, 
  User, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Paperclip
} from 'lucide-react';

export const StudentHomework = () => {
  const { homeworkList, submitHomework } = useHomework();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedHw, setSelectedHw] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const pendingList = homeworkList.filter(hw => hw.status === 'Pending');
  const completedList = homeworkList.filter(hw => hw.status === 'Submitted');
  const currentList = activeTab === 'pending' ? pendingList : completedList;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (hwId) => {
    if (!uploadFile) {
      alert('Please select a file to upload first.');
      return;
    }
    submitHomework(hwId, { fileName: uploadFile.name });
    setUploadFile(null);
    setSelectedHw(null);
    alert('Homework submitted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors select-none ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-foreground'
          }`}
        >
          Pending Homework ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors select-none ${
            activeTab === 'completed'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-foreground'
          }`}
        >
          Completed Homework ({completedList.length})
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Homework list column */}
        <div className="lg:col-span-2 space-y-4">
          {currentList.length === 0 ? (
            <EmptyState 
              title="No Homework Found" 
              description={activeTab === 'pending' ? "Hooray! No pending homework assignments." : "No submitted assignments yet."}
              icon={CheckCircle}
            />
          ) : (
            currentList.map((hw) => (
              <Card 
                key={hw.id}
                onClick={() => { setSelectedHw(hw); setUploadFile(null); }}
                className={`p-5 cursor-pointer border hover:border-primary/20 ${
                  selectedHw?.id === hw.id ? 'border-primary shadow-premium' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={hw.priority === 'High' ? 'danger' : hw.priority === 'Medium' ? 'warning' : 'info'}>
                      {hw.priority} Priority
                    </Badge>
                    <Badge variant={hw.status === 'Submitted' ? 'success' : 'warning'}>
                      {hw.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {hw.dueDate}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground leading-tight">{hw.subject}</h3>
                
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
                  <User className="w-3.5 h-3.5" />
                  <span>Assigned by {hw.teacher}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {hw.description}
                </p>

                {hw.attachments.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-4 text-[10px] text-primary font-bold">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{hw.attachments.length} attachment(s)</span>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Details & Submission Panel */}
        <div className="lg:col-span-1">
          {selectedHw ? (
            <Card className="p-6 sticky top-24 border border-border">
              <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border">
                Assignment Details
              </h3>
              
              <div className="space-y-4 mt-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Subject</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedHw.subject}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Teacher</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedHw.teacher}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Description</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{selectedHw.description}</p>
                </div>

                {selectedHw.attachments.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Attachments</span>
                    <div className="space-y-2 mt-1.5">
                      {selectedHw.attachments.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
                          <span className="text-[10px] font-bold truncate max-w-[150px]">{file.name}</span>
                          <span className="text-[9px] text-slate-400">{file.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submission Flow */}
                {selectedHw.status === 'Pending' ? (
                  <div className="pt-4 border-t border-border">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Upload Submission</span>
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 cursor-pointer hover:border-primary duration-100">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-[10px] font-bold text-slate-500">
                        {uploadFile ? uploadFile.name : 'Select PDF, Image, DOC, or ZIP'}
                      </span>
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" 
                        className="hidden" 
                        onChange={handleFileChange} 
                      />
                    </label>
                    <button
                      onClick={() => handleUploadSubmit(selectedHw.id)}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-semibold shadow-premium mt-4 transition-all active:scale-95 duration-100 select-none"
                    >
                      Submit Homework
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border space-y-4">
                    <div>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase block">Submitted Document</span>
                      <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mt-1">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 truncate">{selectedHw.submission?.fileName}</span>
                      </div>
                    </div>

                    {selectedHw.submission?.marks ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Marks Awarded</span>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedHw.submission.marks}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                          <p className="text-xs font-bold text-emerald-500 mt-0.5">Graded</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">Awaiting Grading</p>
                      </div>
                    )}

                    {selectedHw.submission?.feedback && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block flex items-center gap-1 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          Teacher Feedback
                        </span>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {selectedHw.submission.feedback}
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Replace Submission</span>
                      <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl bg-slate-50/20 dark:bg-slate-900/5 cursor-pointer hover:border-primary duration-100">
                        <Upload className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[9px] font-bold text-slate-500">
                          {uploadFile ? uploadFile.name : 'Upload New File'}
                        </span>
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                      </label>
                      {uploadFile && (
                        <button
                          onClick={() => handleUploadSubmit(selectedHw.id)}
                          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl text-xs font-semibold shadow-premium mt-3 transition-all active:scale-95 duration-100 select-none"
                        >
                          Submit Replacement
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-slate-400 border border-border sticky top-24">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">Select an assignment from the list to view instructions and submit.</p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};
