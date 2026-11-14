'use client';

import { useState } from 'react';
import { FileText, Send, Clock } from 'lucide-react';
import type { Note } from '@/types/crm';
import { formatDate } from '@/lib/utils';

interface Props {
  notes: Note[];
  accountId: string;
  accountName: string;
}

export default function NotesPanel({ notes, accountId, accountName }: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, content: content.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMsg('Note written to MCP successfully.');
      setContent('');
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-slate-600" />
          Notes
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Account notes from MCP. Write new notes directly to the MCP API.
        </p>
      </div>

      {/* Write note */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Write Note to MCP</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Add a note for ${accountName}…`}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <div>
              {msg && (
                <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                  {msg}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Send size={14} />
              {sending ? 'Sending…' : 'Write Note'}
            </button>
          </div>
        </form>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No notes loaded</p>
          <p className="text-gray-400 text-sm mt-1">Sync MCP data to load account notes</p>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{note.author}</span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} />
          {formatDate(note.timestamp)}
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map(tag => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-mono text-gray-300 mt-2">{note.id}</p>
    </div>
  );
}
