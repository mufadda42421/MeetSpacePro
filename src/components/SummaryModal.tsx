import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Download, ListChecks, FileText, CheckCircle2 } from 'lucide-react';
import { useMeeting } from '../contexts/MeetingContext';

interface SummaryModalProps {
  onClose: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ onClose }) => {
  const { meetingSummary, isSummarizing } = useMeeting();
  const [copied, setCopied] = useState<boolean>(false);

  const formatMarkdown = () => {
    if (!meetingSummary) return '';
    return [
      `# Meeting Summary & Action Items`,
      `\n## Executive Summary`,
      meetingSummary.summary,
      `\n## Key Takeaways`,
      ...meetingSummary.keyPoints.map(k => `- ${k}`),
      `\n## Action Items`,
      ...meetingSummary.actionItems.map(a => `- [ ] ${a}`),
    ].join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = formatMarkdown();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'MeetSpace_Summary.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Meeting Intelligence</h3>
              <p className="text-[11px] text-slate-400">Generated via Gemini 3.8 from conference transcript</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed">
          {isSummarizing ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 font-medium">Analyzing speech transcripts and extracting action items...</p>
            </div>
          ) : !meetingSummary ? (
            <div className="text-center py-12 text-slate-500">
              No summary available. Speak or chat during the meeting to generate AI notes.
            </div>
          ) : (
            <>
              {/* Executive Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Executive Summary</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-300">
                  <p>{meetingSummary.summary}</p>
                </div>
              </div>

              {/* Key Decisions */}
              {meetingSummary.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Key Takeaways & Decisions</span>
                  </div>
                  <ul className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-300 list-disc list-inside">
                    {meetingSummary.keyPoints.map((point, idx) => (
                      <li key={idx} className="leading-normal">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {meetingSummary.actionItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                    <ListChecks className="w-4 h-4 text-cyan-400" />
                    <span>Assigned Tasks & Action Items</span>
                  </div>
                  <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5">
                    {meetingSummary.actionItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-200">
                        <span className="w-4 h-4 rounded border border-white/20 mt-0.5 shrink-0" />
                        <span className="leading-normal">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {meetingSummary && !isSummarizing && (
          <div className="p-4 border-t border-white/10 bg-slate-950/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Ready to share with your team</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Markdown' : 'Copy Text'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
