import React, { useState } from 'react';
import { useAcademics } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  BookOpen, 
  User, 
  FileText, 
  Video, 
  Download, 
  ChevronRight, 
  BookMarked 
} from 'lucide-react';

export const StudentAcademics = () => {
  const { academics } = useAcademics();
  const [selectedSubject, setSelectedSubject] = useState('All');

  const subjects = academics?.subjects || [];
  const materials = academics?.materials || [];

  const filteredMaterials = selectedSubject === 'All' 
    ? materials 
    : materials.filter(m => m.subject === selectedSubject);

  const handleDownload = (fileName) => {
    alert(`Downloading ${fileName}... (Mock)`);
  };

  return (
    <div className="space-y-6">
      {/* Subject cards & syllabus progress */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assigned Subjects & Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map((sub, i) => (
            <Card 
              key={i} 
              onClick={() => setSelectedSubject(sub.name)}
              className={`p-5 cursor-pointer border hover:border-primary/20 ${
                selectedSubject === sub.name ? 'border-primary shadow-premium' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary">{sub.rooms}</Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <h4 className="text-xs font-bold text-foreground">{sub.name}</h4>
              
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{sub.teacher}</span>
              </div>

              {/* Progress */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-1.5">
                  <span>Syllabus Completion</span>
                  <span>{sub.syllabusProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ width: `${sub.syllabusProgress}%` }}
                  ></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Materials filter chips */}
      <div className="pt-2">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Study Materials & Notes</h3>
          {selectedSubject !== 'All' && (
            <button 
              onClick={() => setSelectedSubject('All')}
              className="text-primary text-[10px] font-bold hover:underline"
            >
              Show All Subjects
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4">
          {['All', ...subjects.map(s => s.name)].map((subName) => (
            <button
              key={subName}
              onClick={() => setSelectedSubject(subName)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold select-none whitespace-nowrap transition-colors ${
                selectedSubject === subName 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {subName}
            </button>
          ))}
        </div>

        {/* Materials List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.length === 0 ? (
            <div className="col-span-2">
              <EmptyState 
                title="No Materials Found" 
                description="There are no reference study files uploaded for this subject yet."
                icon={BookMarked}
              />
            </div>
          ) : (
            filteredMaterials.map((file) => {
              const isVideo = file.type === 'Video';
              return (
                <Card key={file.id} className="p-4 flex items-center justify-between gap-4 border border-border">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      isVideo 
                        ? 'bg-rose-500/10 text-rose-500' 
                        : file.type === 'PDF' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {isVideo ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{file.title}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-1 font-semibold">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[8px]">{file.subject}</Badge>
                        <span>{isVideo ? file.duration : file.size}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(file.title)}
                    className="p-2 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-900 rounded-xl text-slate-500 transition-colors shrink-0 active:scale-95 duration-100 select-none"
                    title={isVideo ? "Watch Lecture" : "Download File"}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
