/**
 * MuroCommunication.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Syndicats
 * Extraído de: src/App.tsx (L22424–L22521) — Fase 4 del desmantelamiento modular
 *
 * Mur de Communication (tableau interne Syndicat) — persistance réelle
 * Firestore (collection `communityPosts`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { ArrowLeft, Bell, ChevronDown, Send, Loader2, AlertCircle } from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService, type CommunityPostDoc } from "../../lib/dataService";

export interface MuroCommunicationProps {
  darkMode: boolean;
  adminName: string;
  adminRole: string;
  adminPhoto: string;
  setVista: (vista: string) => void;
  WorkspaceSidebar: React.ComponentType;
  companyId: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 1) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  const minutes = Math.floor(diffMs / 60000);
  return `Il y a ${Math.max(1, minutes)} minute${minutes > 1 ? "s" : ""}`;
}

const MuroCommunication: React.FC<MuroCommunicationProps> = ({
  darkMode,
  adminName,
  adminRole,
  adminPhoto,
  setVista,
  WorkspaceSidebar,
  companyId,
}) => {
  const [posts, setPosts] = useState<CommunityPostDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyId) {
      setIsLoading(false);
      return;
    }
    dataService
      .fetchCommunityPosts(uid, companyId)
      .then((data) =>
        setPosts(
          data.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        )
      )
      .catch((err) => console.error("Failed to load community posts:", err))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  const handlePublish = async () => {
    const uid = auth.currentUser?.uid;
    const content = newContent.trim();
    if (!uid || !content || isPublishing) return;
    setIsPublishing(true);
    try {
      const saved = await dataService.saveCommunityPost(uid, {
        id: "",
        companyId,
        authorName: adminName,
        authorRole: adminRole,
        type: "annonce",
        content,
      });
      setPosts((prev) => [saved, ...prev]);
      setNewContent("");
    } catch (err) {
      console.error("Failed to publish post:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReply = async (post: CommunityPostDoc) => {
    const uid = auth.currentUser?.uid;
    const reply = (replyDrafts[post.id] || "").trim();
    if (!uid || !reply) return;
    setSavingReplyId(post.id);
    try {
      const saved = await dataService.saveCommunityPost(uid, {
        ...post,
        adminReply: reply,
        adminReplyAt: new Date().toISOString(),
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? saved : p)));
      setReplyDrafts((prev) => ({ ...prev, [post.id]: "" }));
    } catch (err) {
      console.error("Failed to save reply:", err);
    } finally {
      setSavingReplyId(null);
    }
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-transparent text-white" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72`}
    >
      {darkMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-rose-650/10 blur-[100px]" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-indigo-650/10 blur-[100px]" />
        </div>
      )}

      <WorkspaceSidebar />

      <header
        className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b shadow-sm sticky top-0 z-50 flex items-center justify-between`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setVista("dashboard")}
            className={`p-2 rounded-xl transition-colors ${darkMode ? "text-zinc-400 hover:bg-zinc-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
              <span>AutoCompt</span>
              <span>/</span>
              <span>Tableau de Bord</span>
              <span>/</span>
              <span className="text-rose-500 font-bold">Mur de Communication</span>
            </div>
            <h1 className="font-black uppercase italic tracking-tighter text-base sm:text-lg mt-0.5">
              Mur de Communication
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            className={`p-2 rounded-lg relative transition-all ${darkMode ? "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800" : "bg-white shadow-sm border border-slate-200 text-slate-450 hover:bg-slate-50"}`}
          >
            <Bell size={14} />
          </button>
          <div className="flex items-center gap-2.5 bg-slate-50/50 dark:bg-zinc-900/40 p-1.5 pr-3 rounded-full border border-slate-150 dark:border-zinc-800 shadow-sm hover:border-rose-500/30 transition-all cursor-pointer">
            <img
              src={adminPhoto}
              alt={adminName}
              className="w-7 h-7 rounded-full border border-violet-500/20 object-cover shadow-sm"
            />
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1 leading-none">
                <p className="text-[9px] font-black uppercase tracking-tight text-slate-900 dark:text-zinc-150">
                  {adminName}
                </p>
                <ChevronDown size={8} className="text-slate-400" />
              </div>
              <p className="text-[7px] font-bold uppercase text-rose-500 tracking-wider mt-0.5 leading-none">
                {adminRole}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full p-4 sm:p-6 mx-auto space-y-6">
        {/* Warning session banner */}
        {!auth.currentUser?.uid && (
          <div className={`p-4 rounded-2xl flex items-start gap-3 border ${darkMode ? "bg-amber-950/20 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider">Mode Démo — Bouton Publier Inactif</p>
              <p className="text-[9px] font-bold mt-1 leading-normal uppercase">
                Aucun compte connecté. Le botón de publication restera bloqué car la publication d'avis officiels nécessite une authentification active.
              </p>
            </div>
          </div>
        )}

        {/* Zone de publication */}
        <div
          className={`rounded-[32px] p-6 shadow-sm border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-slate-200"}`}
        >
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className={`w-full p-4 rounded-2xl border outline-none resize-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
                rows={3}
                placeholder="Publier une annonce, un avis technique ou un incident..."
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handlePublish}
                  disabled={!newContent.trim() || isPublishing}
                  className="px-6 py-2 bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2"
                >
                  {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Publier l'Avis
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Publications */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-rose-500" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <p
            className={`text-center text-xs font-bold uppercase tracking-wider py-10 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
          >
            Aucune publication pour l'instant. Utilisez le champ ci-dessus pour commencer.
          </p>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200"}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${post.type === "incident" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-700"}`}
                  >
                    {post.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{post.authorName}</p>
                    <p
                      className={`text-[10px] uppercase font-black tracking-wider ${post.type === "incident" ? "text-rose-500" : "text-emerald-500"}`}
                    >
                      {post.type === "incident" ? "Signalement d'Incident" : "Annonce Officielle"} • {timeAgo(post.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm">{post.content}</p>

                {post.adminReply && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs flex gap-2">
                    <div className="font-bold text-emerald-600">Admin:</div>
                    <p>{post.adminReply}</p>
                  </div>
                )}

                {!post.adminReply && (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={replyDrafts[post.id] || ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Répondre en tant qu'admin..."
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                    <button
                      onClick={() => handleReply(post)}
                      disabled={!(replyDrafts[post.id] || "").trim() || savingReplyId === post.id}
                      className="px-4 py-2 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                      {savingReplyId === post.id ? "..." : "Répondre"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MuroCommunication;
