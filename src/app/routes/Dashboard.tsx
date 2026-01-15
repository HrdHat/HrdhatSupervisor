import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { supabase } from '@/config/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { useSupervisorStore } from '@/stores/supervisorStore';

interface DocumentStats {
  total: number;
  unsorted: number;
  filed: number;
  todayCount: number;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const projects = useSupervisorStore((s) => s.projects);
  const loading = useSupervisorStore((s) => s.loading);
  const fetchProjects = useSupervisorStore((s) => s.fetchProjects);

  const [docStats, setDocStats] = useState<DocumentStats>({ total: 0, unsorted: 0, filed: 0, todayCount: 0 });
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch document stats when projects are loaded
  useEffect(() => {
    const fetchDocumentStats = async () => {
      if (projects.length === 0) return;

      setLoadingDocs(true);
      try {
        // Get all project IDs
        const projectIds = projects.map(p => p.id);
        
        // Query all documents for these projects
        const { data: docs, error } = await supabase
          .from('received_documents')
          .select('id, folder_id, status, received_at')
          .in('project_id', projectIds)
          .neq('status', 'rejected');

        if (error) {
          console.error('Failed to fetch document stats:', error);
          return;
        }

        // Calculate stats
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const stats: DocumentStats = {
          total: docs?.length ?? 0,
          unsorted: docs?.filter(d => d.folder_id === null).length ?? 0,
          filed: docs?.filter(d => d.folder_id !== null).length ?? 0,
          todayCount: docs?.filter(d => d.received_at >= todayStart).length ?? 0,
        };

        setDocStats(stats);
      } catch (err) {
        console.error('Error fetching document stats:', err);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocumentStats();
  }, [projects]);

  const activeProjects = projects.filter((p) => p.is_active);

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
              <h1 className="text-xl font-bold text-white">HrdHat Supervisor</h1>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Welcome back!</h2>
          <p className="text-slate-400 mt-1">Here's an overview of your projects</p>
        </div>

        {/* Unsorted Documents Alert */}
        {docStats.unsorted > 0 && (
          <Link
            to="/projects"
            className="block mb-6 p-4 bg-[#d1bd23]/10 border-2 border-[#d1bd23]/30 rounded-xl hover:bg-[#d1bd23]/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d1bd23]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#d1bd23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#e4c94f]">
                    {docStats.unsorted} Document{docStats.unsorted !== 1 ? 's' : ''} Need Review
                  </h3>
                  <p className="text-sm text-slate-400">
                    Click to go to projects and review unsorted documents
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[#d1bd23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="text-sm font-medium text-slate-400">Active Projects</div>
            <div className="text-3xl font-bold text-[#d1bd23] mt-2">{activeProjects.length}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="text-sm font-medium text-slate-400">Total Documents</div>
            <div className="text-3xl font-bold text-white mt-2">
              {loadingDocs ? '...' : docStats.total}
            </div>
            {docStats.filed > 0 && (
              <div className="text-xs text-[#7fb069] mt-1">{docStats.filed} filed</div>
            )}
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="text-sm font-medium text-slate-400">Documents Today</div>
            <div className="text-3xl font-bold text-white mt-2">
              {loadingDocs ? '...' : docStats.todayCount}
            </div>
          </div>
          <div className={`rounded-xl p-6 backdrop-blur-sm ${docStats.unsorted > 0 ? 'bg-[#d1bd23]/10 border-2 border-[#d1bd23]/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
            <div className="text-sm font-medium text-slate-400">Needs Review</div>
            <div className={`text-3xl font-bold mt-2 ${docStats.unsorted > 0 ? 'text-[#d1bd23]' : 'text-white'}`}>
              {loadingDocs ? '...' : docStats.unsorted}
            </div>
            {docStats.unsorted > 0 && (
              <div className="text-xs text-[#e4c94f] mt-1">unsorted documents</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/projects"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors border border-slate-600"
            >
              View All Projects
            </Link>
            <Link
              to="/projects?new=true"
              className="px-4 py-2 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all"
            >
              Create New Project
            </Link>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No projects yet. Create your first project to get started!</p>
              <Link
                to="/projects?new=true"
                className="inline-block px-4 py-2 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] hover:from-[#b19e1d] hover:to-[#7a4a15] text-white rounded-xl transition-all"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block p-4 rounded-xl border border-slate-700/50 hover:border-[#d1bd23]/50 hover:bg-slate-700/30 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-white">{project.name}</h4>
                      {project.site_address && (
                        <p className="text-sm text-slate-400 mt-1">{project.site_address}</p>
                      )}
                    </div>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
