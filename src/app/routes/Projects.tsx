import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';
import { useSupervisorStore, FORM_TYPE_PRESETS } from '@/stores/supervisorStore';

type WizardStep = 'basic' | 'forms' | 'complete';

export default function Projects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showNewModal = searchParams.get('new') === 'true';

  // Wizard state
  const [showCreateModal, setShowCreateModal] = useState(showNewModal);
  const [wizardStep, setWizardStep] = useState<WizardStep>('basic');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [selectedFormTypes, setSelectedFormTypes] = useState<string[]>(['FLRA', 'Daily Safety Report']);
  const [createdProject, setCreatedProject] = useState<{ id: string; processingEmail: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const projects = useSupervisorStore((s) => s.projects);
  const loading = useSupervisorStore((s) => s.loading);
  const error = useSupervisorStore((s) => s.error);
  const fetchProjects = useSupervisorStore((s) => s.fetchProjects);
  const createProjectWithSetup = useSupervisorStore((s) => s.createProjectWithSetup);
  const clearError = useSupervisorStore((s) => s.clearError);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const resetWizard = () => {
    setWizardStep('basic');
    setNewProjectName('');
    setNewProjectAddress('');
    setSelectedFormTypes(['FLRA', 'Daily Safety Report']);
    setCreatedProject(null);
    setCopied(false);
    clearError();
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetWizard();
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      setWizardStep('forms');
    }
  };

  const handleFormTypesSubmit = async () => {
    clearError();

    const result = await createProjectWithSetup(
      {
        name: newProjectName,
        site_address: newProjectAddress || undefined,
      },
      selectedFormTypes
    );

    if (result) {
      setCreatedProject({
        id: result.project.id,
        processingEmail: result.processingEmail,
      });
      setWizardStep('complete');
    }
  };

  const toggleFormType = (formType: string) => {
    setSelectedFormTypes((prev) =>
      prev.includes(formType) ? prev.filter((f) => f !== formType) : [...prev, formType]
    );
  };

  const copyEmailToClipboard = async () => {
    if (createdProject?.processingEmail) {
      await navigator.clipboard.writeText(createdProject.processingEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaText = () => {
    if (createdProject?.processingEmail) {
      const message = `Submit your safety forms to: ${createdProject.processingEmail}`;
      window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const goToProject = () => {
    if (createdProject?.id) {
      navigate(`/projects/${createdProject.id}`);
    }
    handleCloseModal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated gradient orbs */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #d1bd23 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-15 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7fb069 0%, transparent 70%)',
          animation: 'pulse 10s ease-in-out infinite reverse',
        }}
      />

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-white hover:text-[#d1bd23] transition-colors">
                HrdHat Supervisor
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">Projects</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Projects</h2>
            <p className="text-slate-400 mt-1">Manage your construction projects</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all"
          >
            + New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 border border-slate-700/50 text-center">
            <div className="text-slate-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-slate-400 mb-6">Create your first project to start managing forms and workers.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-[#d1bd23]/50 transition-all"
              >
                <Link to={`/projects/${project.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white hover:text-[#e4c94f] transition-colors">
                      {project.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        project.is_active
                          ? 'bg-[#7fb069]/20 text-[#7fb069]'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {project.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {project.site_address && (
                    <p className="text-sm text-slate-400 mb-4">{project.site_address}</p>
                  )}
                </Link>

                {/* Processing Email */}
                {project.processing_email && (
                  <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-400">Email for forms:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-[#d1bd23] break-all flex-1">
                        {project.processing_email}
                      </code>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(project.processing_email);
                        }}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Copy email"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <Link
                  to={`/projects/${project.id}`}
                  className="text-xs text-slate-500 hover:text-[#d1bd23] transition-colors"
                >
                  Created {new Date(project.created_at).toLocaleDateString()} →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Wizard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    wizardStep === 'basic' ? 'bg-[#d1bd23] text-slate-900' : 'bg-[#7fb069] text-white'
                  }`}
                >
                  {wizardStep === 'basic' ? '1' : '✓'}
                </div>
                <div
                  className={`w-16 h-1 mx-2 ${
                    wizardStep !== 'basic' ? 'bg-[#7fb069]' : 'bg-slate-700'
                  }`}
                />
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    wizardStep === 'forms'
                      ? 'bg-[#d1bd23] text-slate-900'
                      : wizardStep === 'complete'
                      ? 'bg-[#7fb069] text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {wizardStep === 'complete' ? '✓' : '2'}
                </div>
                <div
                  className={`w-16 h-1 mx-2 ${
                    wizardStep === 'complete' ? 'bg-[#7fb069]' : 'bg-slate-700'
                  }`}
                />
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    wizardStep === 'complete' ? 'bg-[#7fb069] text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  3
                </div>
              </div>
            </div>

            {/* Step 1: Basic Info */}
            {wizardStep === 'basic' && (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Create New Project</h3>
                <p className="text-slate-400 mb-6">Step 1: Enter project details</p>

                <form onSubmit={handleBasicSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="project-name" className="block text-sm font-medium text-slate-300 mb-2">
                      Project Name *
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-[#d1bd23] focus:ring-1 focus:ring-[#d1bd23] outline-none transition-all"
                      placeholder="e.g., Downtown Office Tower"
                    />
                  </div>

                  <div>
                    <label htmlFor="project-address" className="block text-sm font-medium text-slate-300 mb-2">
                      Site Address
                    </label>
                    <input
                      id="project-address"
                      type="text"
                      value={newProjectAddress}
                      onChange={(e) => setNewProjectAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-[#d1bd23] focus:ring-1 focus:ring-[#d1bd23] outline-none transition-all"
                      placeholder="e.g., 123 Main St, Toronto, ON"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newProjectName.trim()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Select Forms →
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Step 2: Select Required Form Types */}
            {wizardStep === 'forms' && (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Required Forms</h3>
                <p className="text-slate-400 mb-6">
                  Step 2: What forms are required for <strong className="text-[#e4c94f]">{newProjectName}</strong>?
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 max-h-64 overflow-y-auto">
                  {FORM_TYPE_PRESETS.map((formType) => (
                    <button
                      key={formType.name}
                      type="button"
                      onClick={() => toggleFormType(formType.name)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedFormTypes.includes(formType.name)
                          ? 'border-[#d1bd23] bg-[#d1bd23]/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: formType.color }}
                        />
                        <span className="font-medium text-white text-sm">{formType.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  {selectedFormTypes.length} form type(s) selected. AI will auto-classify incoming documents into these
                  folders.
                </p>

                {error && (
                  <div className="p-3 rounded-xl bg-[#d94730]/10 border border-[#d94730]/30 mb-4">
                    <p className="text-sm text-[#e58c7f]">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep('basic')}
                    className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFormTypesSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Complete - Show Email */}
            {wizardStep === 'complete' && createdProject && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#7fb069]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#7fb069]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Project Created!</h3>
                  <p className="text-slate-400">{newProjectName} is ready to receive forms</p>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-400 mb-2">Workers should email forms to:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-[#d1bd23] truncate">
                      {createdProject.processingEmail}
                    </div>
                    <button
                      onClick={copyEmailToClipboard}
                      className={`px-4 py-3 rounded-xl transition-all ${
                        copied
                          ? 'bg-[#7fb069] text-white'
                          : 'bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white'
                      }`}
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={shareViaText}
                    className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Share via Text
                  </button>
                </div>

                <div className="bg-[#d1bd23]/10 border border-[#d1bd23]/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-300">
                    <strong className="text-[#e4c94f]">Note:</strong> Email intake requires SendGrid setup. Until then, workers can upload forms
                    directly in the project.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={goToProject}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all"
                  >
                    Go to Project →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
