import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal } from '../components/ui/Modal';
import { FileUpload } from '../components/ui/FileUpload';
import { useToast } from '../components/ui/Toast';
import { mockSyllabus, mockStudyMaterial } from '../data/mockData';
import { BookMarked, CheckCircle, Circle, Upload, Link2, FileText, Video, Plus, ExternalLink } from 'lucide-react';

export const TeacherAcademics = () => {
  const toast = useToast();
  const [tab, setTab] = useState('syllabus');
  const [syllabus, setSyllabus] = useState(mockSyllabus?.['Mathematics-9A'] || []);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', subject: 'Mathematics', class: 'cls-9a', type: 'PDF', link: '' });

  const completedCount = (syllabus || []).filter(ch => ch.completed).length;
  const progressPct = (syllabus && syllabus.length > 0) ? Math.round((completedCount / syllabus.length) * 100) : 0;

  const toggleChapter = (id) => {
    setSyllabus(prev => (prev || []).map(ch =>
      ch.id === id
        ? { ...ch, completed: !ch.completed, completionDate: !ch.completed ? new Date().toISOString().split('T')[0] : null }
        : ch
    ));
    toast.success('Syllabus updated!');
  };

  const matTypeIcon = { PDF: FileText, Video: Video, Link: Link2 };
  const matTypeVariant = { PDF: 'danger', Video: 'purple', Link: 'info' };

  const handleUpload = async (e) => {
    e.preventDefault();
    await new Promise(r => setTimeout(r, 500));
    toast.success('Study material uploaded successfully!');
    setShowUpload(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Academics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage syllabus, study materials and lesson plans</p>
        </div>
        {tab === 'material' && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-premium hover:bg-primary-hover active:scale-95 transition-all select-none"
            id="academics-upload-btn"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        )}
      </div>

      <FilterBar
        filters={[
          { value: 'syllabus', label: 'Syllabus' },
          { value: 'material', label: 'Study Material' },
          { value: 'lesson', label: 'Lesson Plan' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Syllabus Tab */}
      {tab === 'syllabus' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mathematics — Class 9A</h3>
              <Badge variant="primary">{completedCount}/{syllabus?.length || 0} Chapters</Badge>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-right">{progressPct}% Completed</p>
          </Card>

          <div className="space-y-3">
            {(syllabus || []).length === 0 ? (
              <Card>
                <p className="text-xs text-slate-400 text-center py-6">No syllabus chapters found</p>
              </Card>
            ) : (
              syllabus.map(ch => (
                <Card key={ch.id}>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleChapter(ch.id)}
                      className={`shrink-0 mt-0.5 p-0.5 rounded-full transition-all ${ch.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-primary'}`}
                    >
                      {ch.completed
                        ? <CheckCircle className="w-5 h-5" />
                        : <Circle className="w-5 h-5" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-xs font-bold ${ch.completed ? 'text-slate-400 line-through' : 'text-foreground'}`}>
                          {ch.chapter}
                        </h4>
                        {ch.completed && <Badge variant="success">Done</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {ch.topics.map(t => (
                          <span key={t} className="text-[9px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">{t}</span>
                        ))}
                      </div>
                      {ch.completionDate && (
                        <p className="text-[10px] text-slate-400">Completed: {ch.completionDate}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Study Material Tab */}
      {tab === 'material' && (
        <div className="space-y-3">
          {(mockStudyMaterial || []).length === 0 ? (
            <Card>
              <p className="text-xs text-slate-400 text-center py-6">No study materials available</p>
            </Card>
          ) : (
            mockStudyMaterial.map(mat => {
            const Icon = matTypeIcon[mat.type] || FileText;
            return (
              <Card key={mat.id}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${mat.type === 'PDF' ? 'bg-rose-500/10 text-rose-500' : mat.type === 'Video' ? 'bg-purple-500/10 text-purple-500' : 'bg-sky-500/10 text-sky-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={matTypeVariant[mat.type] || 'default'}>{mat.type}</Badge>
                      <Badge variant="info">{mat.class}</Badge>
                      <Badge variant="default">{mat.subject}</Badge>
                    </div>
                    <h4 className="text-xs font-bold text-foreground truncate">{mat.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {mat.size ? mat.size + ' • ' : ''}{mat.uploadedAt}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Card>
            );
            })
          )}
        </div>
      )}

      {/* Lesson Plan Tab */}
      {tab === 'lesson' && (
        <div className="space-y-4">
          {[
            { week: 'Week 1 (July 1–5)', topic: 'Coordinate Geometry Basics', objectives: 'Understand Cartesian plane, quadrants, plotting points', resources: 'NCERT Ch.4, Worksheet #12' },
            { week: 'Week 2 (July 7–11)', topic: 'Quadratic Equations — Introduction', objectives: 'Define quadratic equations, standard form, roots', resources: 'NCERT Ch.5, Video Lecture' },
            { week: 'Week 3 (July 14–18)', topic: 'Factorization Method', objectives: 'Solve quadratic equations by factorization', resources: 'Practice Sheet #8, Reference PDF' },
            { week: 'Week 4 (July 21–25)', topic: 'Quadratic Formula', objectives: 'Apply Sridharacharya formula for discriminant analysis', resources: 'NCERT Exercise 5.3, Self-assessment' },
          ].map((lesson, i) => (
            <Card key={i}>
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-500 shrink-0">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">{lesson.week}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-foreground mb-0.5">{lesson.topic}</h4>
                  <p className="text-[10px] text-slate-500 mb-1">{lesson.objectives}</p>
                  <p className="text-[10px] text-slate-400">Resources: {lesson.resources}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Material Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Study Material" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
            <input type="text" required placeholder="e.g. Chapter 5 Notes" className="w-full px-4 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" id="material-title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" id="material-subject">
                <option>Mathematics</option>
                <option>Statistics</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" id="material-type">
                <option>PDF</option>
                <option>Video</option>
                <option>Link</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">File / Link</label>
            <FileUpload label="Upload File (PDF / Video)" maxFiles={1} />
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-grow border-t border-border" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">or paste link</span>
              <div className="flex-grow border-t border-border" />
            </div>
            <input type="url" placeholder="https://..." className="w-full mt-2 px-4 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" id="material-link" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-premium hover:bg-primary-hover active:scale-95" id="material-upload-submit">Upload</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
