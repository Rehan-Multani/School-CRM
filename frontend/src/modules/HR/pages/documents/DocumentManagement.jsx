import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi, assetUrl } from '../../../../shared/api/client';
import {
  FolderOpen,
  FileText,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  Plus,
  UploadCloud,
  X,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Filter,
  FileCode,
  Sparkles,
  User,
  Building,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDocId, setDeleteDocId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [documentType, setDocumentType] = useState('PAN Card');
  const [documentName, setDocumentName] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('VERIFIED');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fileInputRef = useRef(null);
  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docRes, empRes] = await Promise.all([
        hrApi.documents(),
        hrApi.employees({ limit: 300 }),
      ]);
      if (docRes?.success) {
        setDocuments(docRes.data || []);
      }
      if (empRes?.success) {
        setEmployees(empRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load document vault');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast('Please choose an employee', 'error');
      return;
    }
    if (!selectedFile) {
      showToast('Please select a document file to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      const emp = employees.find((e) => e.id === selectedEmpId);
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('employeeRefId', selectedEmpId);
      formData.append('employeeName', emp?.name || 'Staff');
      formData.append('employeeId', emp?.employeeId || 'EMP');
      formData.append('documentType', documentType);
      formData.append('documentName', documentName.trim() || selectedFile.name);
      formData.append('verificationStatus', verificationStatus);
      formData.append('remarks', remarks.trim());

      const res = await hrApi.uploadDocument(formData);
      if (res?.success) {
        showToast('Document uploaded and vaulted successfully!', 'success');
        setShowUploadModal(false);
        setSelectedFile(null);
        setPreviewUrl('');
        setDocumentName('');
        setRemarks('');
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDocId) return;
    try {
      await hrApi.deleteDocument(deleteDocId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDocId));
      showToast('Document removed from vault.', 'info');
      setDeleteDocId(null);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete document', 'error');
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      const matchesSearch =
        !searchTerm ||
        (d.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.documentType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'ALL' ||
        (d.documentType || '').toUpperCase() === selectedCategory.toUpperCase();

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (d.verificationStatus || 'VERIFIED').toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [documents, searchTerm, selectedCategory, selectedStatus]);

  const verifiedCount = useMemo(() => {
    return documents.filter((d) => d.verificationStatus === 'VERIFIED' || !d.verificationStatus).length;
  }, [documents]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty & Staff Document Locker"
        subtitle="Vault government identification proofs, academic degrees, contracts, background check verifications, and compliance certificates."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSelectedEmpId(employees[0]?.id || '');
                setShowUploadModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vaulted Files</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{documents.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Uploaded digital assets</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Verified Records</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{verifiedCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Legally cleared items</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending Check</span>
            <div className="text-2xl font-black text-amber-500 mt-1">{documents.length - verifiedCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting review</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-500">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Covered Faculty</span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {new Set(documents.map((d) => d.employeeRefId)).size} Staff
            </div>
            <p className="text-[11px] text-slate-400 mt-1">With uploaded records</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title, staff name, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Aadhaar Card">Aadhaar Card</option>
            <option value="PAN Card">PAN Card</option>
            <option value="Degree Certificate">Degree / Diploma</option>
            <option value="Appointment Letter">Appointment Letter</option>
            <option value="Medical Fitness">Medical Fitness</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Document Roster Table */}
      {loading ? (
        <SkeletonTable rows={7} columns={6} />
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No documents in locker</h4>
          <p className="text-xs max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No documents match your active search or filter criteria.'
              : 'The digital locker is currently empty. Click "Upload Document" above to archive records.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Document Details</th>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Archived Date</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredDocuments.map((doc) => {
                  const isVerified = doc.verificationStatus === 'VERIFIED' || !doc.verificationStatus;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{doc.documentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.fileName || 'document.webp'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-900 dark:text-white font-bold">{doc.employeeName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{doc.employeeId || 'EMP'}</p>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          {doc.documentType || 'General'}
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <Badge variant={isVerified ? 'success' : 'warning'}>
                          {isVerified ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.fileUrl && (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Preview Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteDocId(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing <strong>{filteredDocuments.length}</strong> secured document records
            </span>
            <span>AES-256 Vault Synced</span>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload & Archive Personnel Document"
        size="md"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Select Faculty / Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeId || 'EMP'}) — {e.department || 'General'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Document Category
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Degree Certificate">Degree / Graduation Certificate</option>
                <option value="Appointment Letter">Appointment / Contract Letter</option>
                <option value="Experience Letter">Relieving / Experience Letter</option>
                <option value="Medical Fitness">Medical Fitness Certificate</option>
                <option value="Other">Other Document</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="VERIFIED">Verified & Validated</option>
                <option value="PENDING">Pending Administrative Review</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Document Display Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Master of Science Degree Certificate"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              required
            />
          </div>

          {/* File Dropzone */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Upload Document File (Images/PDF auto-converted to WebP) <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/50"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">File ready to archive ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to browse or drop file here</p>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, WebP, PDF supported up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Internal Compliance Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Original physical copy verified on 22 Aug 2026..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              {uploading ? 'Vaulting...' : 'Upload & Secure'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.documentName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-2xl p-4 flex items-center justify-center min-h-[320px] max-h-[500px] overflow-auto">
              <img
                src={assetUrl(previewDoc.fileUrl)}
                alt={previewDoc.documentName}
                className="max-h-[480px] object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Staff: <strong>{previewDoc.employeeName}</strong> ({previewDoc.employeeId})</span>
              <a
                href={assetUrl(previewDoc.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-650 dark:text-indigo-400 hover:underline font-bold"
              >
                <span>Open Raw Asset</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteDocId}
        title="Delete Vaulted Document?"
        message="Are you sure you want to remove this employee document from the institutional locker? This action cannot be reversed."
        confirmLabel="Delete Asset"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDocId(null)}
      />

      <ToastComponent />
    </div>
  );
};

export default DocumentManagement;
