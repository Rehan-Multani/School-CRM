import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_ACADEMICS } from '../data/mockData';
import { BookOpen, User, FileText, Video, Download } from 'lucide-react';

export const ParentAcademics = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('syllabus');
  const [academics, setAcademics] = useState(null);

  useEffect(() => {
    setAcademics(MOCK_CHILDREN_ACADEMICS[selectedChildId] || null);
  }, [selectedChildId]);

  const handleDownload = (title) => {
    toast.success(`Started downloading study pack: ${title}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Academics & Study Guides</h2>
        <p className="text-xs text-slate-500 mt-0.5">Track curriculum syllabus coverage, lecture materials, and teachers</p>
      </div>

      <FilterBar
        filters={[
          { value: 'syllabus', label: 'Syllabus Progress' },
          { value: 'material', label: 'Syllabus Notes & Video Lectures' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Syllabus Progress */}
      {tab === 'syllabus' && academics && (
        <div className="space-y-4">
          {academics.subjects.map((sub, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-foreground">{sub.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Teacher: {sub.teacher} • Classroom: {sub.rooms}</p>
                </div>
                <Badge variant="primary">{sub.syllabusProgress}% Completed</Badge>
              </div>

              {/* Progress Line */}
              <div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${sub.syllabusProgress}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Syllabus Materials */}
      {tab === 'material' && academics && (
        <div className="space-y-3">
          {academics.materials.map((mat, i) => {
            const isVideo = mat.type === 'Video';
            return (
              <Card key={i} className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${isVideo ? 'bg-purple-500/10 text-purple-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {isVideo ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant={isVideo ? 'purple' : 'danger'}>{mat.type}</Badge>
                    <Badge variant="default">{mat.subject}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">{mat.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isVideo ? mat.duration : mat.size}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(mat.title)}
                  className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all select-none shrink-0"
                  aria-label={`Download ${mat.title}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
