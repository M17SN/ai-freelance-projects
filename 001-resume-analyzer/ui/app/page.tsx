"use client";

import { useState, useRef } from "react";

// ── Types ──
type JobRecommendation = {
  title: string;
  match_percentage: number;
  reason: string;
};

type MatchingJob = {
  title: string;
  company: string;
  skills: string;
  similarity: number;
};

type AnalysisResult = {
  summary: string;
  skills: string[];
  job_recommendations: JobRecommendation[];
  matching_jobs: MatchingJob[];
};

// ── Helper: color based on match % ──
function matchColor(pct: number): string {
  if (pct >= 70) return "var(--accent-green)";
  if (pct >= 40) return "var(--accent-cyan)";
  return "var(--text-secondary)";
}

export default function Home() {
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Handle file selection ──
  function handleFile(f: File) {
    if (!f.name.endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  // ── Drag & drop handlers ──
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Submit to Flask API ──
  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body:   formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <header className="grid-bg" style={{ borderBottom: "1px solid var(--border)", padding: "24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="mono" style={{ color: "var(--accent-cyan)", letterSpacing: "0.2em", marginBottom: "4px" }}>AI TOOL</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Resume Analyzer</h1>
          </div>
          <span className="mono" style={{ color: "var(--text-secondary)" }}>Powered by LLaMA 3.3 · ChromaDB · RAG</span>
        </div>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Upload zone */}
        <div
          className="glass"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            padding: "48px",
            textAlign: "center",
            cursor: "pointer",
            borderColor: dragging ? "var(--accent-cyan)" : file ? "var(--accent-purple)" : "var(--border)",
            boxShadow: dragging ? "0 0 32px rgba(245,158,11,0.15)" : "none",
            marginBottom: "32px",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Upload icon */}
          <div style={{ marginBottom: "16px" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" style={{ margin: "0 auto" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          {file ? (
            <>
              <p style={{ color: "var(--accent-purple)", fontWeight: 600, marginBottom: "4px" }}>{file.name}</p>
              <p className="mono" style={{ color: "var(--text-secondary)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </>
          ) : (
            <>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "4px" }}>Drop your resume here</p>
              <p className="mono" style={{ color: "var(--text-secondary)" }}>or click to browse · PDF only</p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#ef4444", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        {file && !loading && !result && (
          <button
            onClick={analyze}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--accent-cyan)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              marginBottom: "32px",
              transition: "opacity 0.2s",
            }}
          >
            Analyze Resume
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{
              width: "40px", height: "40px",
              border: "3px solid var(--border)",
              borderTop: "3px solid var(--accent-cyan)",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite",
            }} />
            <p className="mono" style={{ color: "var(--text-secondary)" }}>Extracting · Embedding · Searching · Analyzing...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Summary */}
            <div className="glass" style={{ padding: "28px" }}>
              <p className="mono" style={{ color: "var(--accent-cyan)", marginBottom: "12px", letterSpacing: "0.15em" }}>CANDIDATE SUMMARY</p>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{result.summary}</p>
            </div>

            {/* Skills */}
            <div className="glass" style={{ padding: "28px" }}>
              <p className="mono" style={{ color: "var(--accent-cyan)", marginBottom: "16px", letterSpacing: "0.15em" }}>
                EXTRACTED SKILLS <span style={{ color: "var(--text-secondary)" }}>· {result.skills.length} found</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.skills.map((skill) => (
                  <span key={skill} className="tag">{skill}</span>
                ))}
              </div>
            </div>

            {/* Job Recommendations */}
            <div className="glass" style={{ padding: "28px" }}>
              <p className="mono" style={{ color: "var(--accent-cyan)", marginBottom: "20px", letterSpacing: "0.15em" }}>JOB RECOMMENDATIONS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.job_recommendations.map((job, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{job.title}</span>
                      <span className="mono" style={{ color: matchColor(job.match_percentage), fontSize: "0.8rem" }}>
                        {job.match_percentage}% match
                      </span>
                    </div>
                    {/* Match bar */}
                    <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", marginBottom: "10px" }}>
                      <div style={{ height: "100%", width: `${job.match_percentage}%`, background: matchColor(job.match_percentage), borderRadius: "2px", transition: "width 0.8s ease" }} />
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{job.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Matching Jobs from ChromaDB */}
            <div className="glass" style={{ padding: "28px" }}>
              <p className="mono" style={{ color: "var(--accent-cyan)", marginBottom: "20px", letterSpacing: "0.15em" }}>
                RAG MATCHES <span style={{ color: "var(--text-secondary)" }}>· from job database</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {result.matching_jobs.map((job, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", background: "var(--surface-2)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px" }}>{job.title}</p>
                      <p className="mono" style={{ color: "var(--text-secondary)" }}>{job.company}</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "6px" }}>{job.skills}</p>
                    </div>
                    <span className="mono tag tag-cyan" style={{ whiteSpace: "nowrap", marginLeft: "16px" }}>
                      {job.similarity}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyze another */}
            <button
              onClick={() => { setFile(null); setResult(null); setError(null); }}
              style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Analyze Another Resume
            </button>

          </div>
        )}
      </main>
    </div>
  );
}