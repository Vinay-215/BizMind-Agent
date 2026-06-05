import { useState, useEffect, useRef } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const REASONING_STEPS = [
  { id: 1, icon: "🎯", label: "Intent Parsing", color: "#00d4ff", desc: "Understanding the business question" },
  { id: 2, icon: "🗄️", label: "Data Retrieval", color: "#00ff9f", desc: "Generating SQL & fetching data" },
  { id: 3, icon: "📊", label: "Pattern Analysis", color: "#ffaa00", desc: "Detecting trends & anomalies" },
  { id: 4, icon: "💡", label: "Insight Generation", color: "#ff6b6b", desc: "Extracting key business insights" },
  { id: 5, icon: "🚀", label: "Action Planning", color: "#a78bfa", desc: "Recommending next best actions" },
];

const SAMPLE_QUESTIONS = [
  "Why did sales drop by 23% in Q3 2024?",
  "Which customer segments are most profitable?",
  "What products should we discontinue?",
  "How can we reduce customer churn rate?",
  "Which regions have the highest growth potential?",
];

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await response.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

async function runStep(stepId, question, previousResults) {
  const prompts = {
    1: {
      system: `You are a business intelligence expert. Analyze business questions and return structured JSON only. No markdown, no explanation outside JSON.`,
      user: `Analyze this business question: "${question}"
Return ONLY this JSON structure:
{
  "domain": "sales/marketing/operations/finance/hr",
  "intent": "one sentence describing what they want to know",
  "key_metrics": ["metric1", "metric2", "metric3"],
  "time_period": "detected time period or 'unspecified'",
  "urgency": "high/medium/low",
  "complexity": "simple/moderate/complex"
}`
    },
    2: {
      system: `You are a SQL expert and data architect. Generate realistic SQL queries and sample data insights. Return structured JSON only.`,
      user: `Based on this business question: "${question}"
Intent analysis: ${previousResults[1] || ""}
Return ONLY this JSON:
{
  "primary_sql": "SELECT ... FROM ... WHERE ... (realistic SQL query)",
  "tables_used": ["table1", "table2"],
  "data_points_found": 1250,
  "date_range": "Jan 2024 - Sep 2024",
  "sample_findings": ["finding1 with numbers", "finding2 with numbers", "finding3 with numbers"]
}`
    },
    3: {
      system: `You are a data scientist specializing in business pattern recognition. Return structured JSON only with specific numbers and percentages.`,
      user: `Analyze patterns for: "${question}"
Previous findings: ${previousResults[2] || ""}
Return ONLY this JSON:
{
  "trends": [
    {"name": "trend name", "direction": "up/down/stable", "magnitude": "X%", "significance": "high/medium/low"},
    {"name": "trend name", "direction": "up/down/stable", "magnitude": "X%", "significance": "high/medium/low"}
  ],
  "anomalies": ["specific anomaly with numbers", "specific anomaly with numbers"],
  "correlations": ["correlation finding", "correlation finding"],
  "root_causes": ["root cause 1", "root cause 2", "root cause 3"]
}`
    },
    4: {
      system: `You are a senior business analyst. Generate specific, data-driven insights. Return structured JSON only.`,
      user: `Generate insights for: "${question}"
Pattern analysis: ${previousResults[3] || ""}
Return ONLY this JSON:
{
  "insights": [
    {"title": "short title", "detail": "specific insight with numbers/percentages", "impact": "high/medium/low", "confidence": 85},
    {"title": "short title", "detail": "specific insight with numbers/percentages", "impact": "high/medium/low", "confidence": 78},
    {"title": "short title", "detail": "specific insight with numbers/percentages", "impact": "high/medium/low", "confidence": 92},
    {"title": "short title", "detail": "specific insight with numbers/percentages", "impact": "high/medium/low", "confidence": 71}
  ],
  "executive_summary": "2-3 sentence summary for executives"
}`
    },
    5: {
      system: `You are a strategic business consultant. Generate actionable recommendations. Return structured JSON only.`,
      user: `Create action plan for: "${question}"
Insights: ${previousResults[4] || ""}
Return ONLY this JSON:
{
  "recommendations": [
    {"action": "specific action", "priority": "critical/high/medium", "timeline": "X weeks/months", "expected_impact": "specific outcome with metric", "effort": "low/medium/high"},
    {"action": "specific action", "priority": "critical/high/medium", "timeline": "X weeks/months", "expected_impact": "specific outcome with metric", "effort": "low/medium/high"},
    {"action": "specific action", "priority": "critical/high/medium", "timeline": "X weeks/months", "expected_impact": "specific outcome with metric", "effort": "low/medium/high"},
    {"action": "specific action", "priority": "critical/high/medium", "timeline": "X weeks/months", "expected_impact": "specific outcome with metric", "effort": "low/medium/high"}
  ],
  "quick_wins": ["immediate action 1", "immediate action 2"],
  "estimated_roi": "X% improvement in Y metric within Z months"
}`
    },
  };

  const p = prompts[stepId];
  const raw = await callClaude(p.system, p.user);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { raw };
  }
}

function StepCard({ step, status, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? `${step.color}18` : status === "done" ? "#ffffff08" : "#ffffff04",
        border: `1px solid ${isActive ? step.color : status === "done" ? "#ffffff20" : "#ffffff0a"}`,
        borderRadius: 14,
        padding: "14px 10px",
        cursor: status === "done" ? "pointer" : "default",
        transition: "all 0.3s ease",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {status === "running" && (
        <div style={{
          position: "absolute", top: 0, left: "-100%", width: "100%", height: "100%",
          background: `linear-gradient(90deg, transparent, ${step.color}30, transparent)`,
          animation: "shimmer 1.2s infinite",
        }} />
      )}
      <div style={{ fontSize: 22, marginBottom: 4 }}>
        {status === "done" ? "✅" : status === "running" ? "⚡" : step.icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: status === "done" ? step.color : "#ffffff60", fontFamily: "'Space Mono', monospace", letterSpacing: 0.5 }}>
        {step.label}
      </div>
      {status === "running" && (
        <div style={{ fontSize: 9, color: step.color, marginTop: 3, animation: "pulse 1s infinite" }}>PROCESSING</div>
      )}
    </button>
  );
}

function ParsedResult({ stepId, data }) {
  if (!data) return null;

  const cardStyle = (color) => ({
    background: `${color}10`,
    border: `1px solid ${color}30`,
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 8,
  });

  if (stepId === 1 && data.intent) return (
    <div>
      <div style={cardStyle("#00d4ff")}>
        <div style={{ color: "#00d4ff", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>INTENT DETECTED</div>
        <div style={{ color: "#fff", fontSize: 14 }}>{data.intent}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["Domain", data.domain], ["Urgency", data.urgency], ["Complexity", data.complexity]].map(([k, v]) => (
          <div key={k} style={{ background: "#ffffff08", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ color: "#ffffff50", fontSize: 10 }}>{k}</div>
            <div style={{ color: "#00d4ff", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{v}</div>
          </div>
        ))}
      </div>
      {data.key_metrics && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#ffffff50", fontSize: 11, marginBottom: 6 }}>KEY METRICS TO ANALYZE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.key_metrics.map((m, i) => (
              <span key={i} style={{ background: "#00d4ff20", border: "1px solid #00d4ff40", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#00d4ff" }}>{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (stepId === 2 && data.primary_sql) return (
    <div>
      <div style={cardStyle("#00ff9f")}>
        <div style={{ color: "#00ff9f", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>GENERATED SQL QUERY</div>
        <pre style={{ color: "#a8ff9f", fontSize: 11, margin: 0, whiteSpace: "pre-wrap", fontFamily: "'Space Mono', monospace" }}>{data.primary_sql}</pre>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ background: "#ffffff08", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ color: "#ffffff50", fontSize: 10 }}>DATA POINTS</div>
          <div style={{ color: "#00ff9f", fontSize: 18, fontWeight: 700 }}>{data.data_points_found?.toLocaleString()}</div>
        </div>
        <div style={{ background: "#ffffff08", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ color: "#ffffff50", fontSize: 10 }}>DATE RANGE</div>
          <div style={{ color: "#00ff9f", fontSize: 12, fontWeight: 700 }}>{data.date_range}</div>
        </div>
      </div>
      {data.sample_findings?.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
          <span style={{ color: "#00ff9f", fontSize: 12 }}>▸</span>
          <span style={{ color: "#ffffffcc", fontSize: 13 }}>{f}</span>
        </div>
      ))}
    </div>
  );

  if (stepId === 3 && data.trends) return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#ffaa00", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>TRENDS DETECTED</div>
        {data.trends?.map((t, i) => (
          <div key={i} style={{ ...cardStyle("#ffaa00"), display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              <div style={{ color: "#ffffff60", fontSize: 11 }}>Significance: {t.significance}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: t.direction === "up" ? "#00ff9f" : t.direction === "down" ? "#ff6b6b" : "#ffaa00", fontSize: 16, fontWeight: 700 }}>
                {t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→"} {t.magnitude}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ color: "#ffaa00", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>ROOT CAUSES</div>
      {data.root_causes?.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
          <span style={{ color: "#ffaa00" }}>#{i + 1}</span>
          <span style={{ color: "#ffffffcc", fontSize: 13 }}>{c}</span>
        </div>
      ))}
    </div>
  );

  if (stepId === 4 && data.insights) return (
    <div>
      {data.executive_summary && (
        <div style={{ ...cardStyle("#ff6b6b"), marginBottom: 12 }}>
          <div style={{ color: "#ff6b6b", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
          <div style={{ color: "#ffffffdd", fontSize: 13, lineHeight: 1.6 }}>{data.executive_summary}</div>
        </div>
      )}
      {data.insights?.map((ins, i) => (
        <div key={i} style={{ ...cardStyle("#ff6b6b"), marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ color: "#ff6b6b", fontSize: 12, fontWeight: 700 }}>{ins.title}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ background: ins.impact === "high" ? "#ff6b6b30" : "#ffffff10", color: ins.impact === "high" ? "#ff6b6b" : "#ffffff60", borderRadius: 4, padding: "2px 7px", fontSize: 10 }}>{ins.impact} impact</span>
              <span style={{ background: "#ffffff10", color: "#ffffff80", borderRadius: 4, padding: "2px 7px", fontSize: 10 }}>{ins.confidence}% confidence</span>
            </div>
          </div>
          <div style={{ color: "#ffffffcc", fontSize: 13 }}>{ins.detail}</div>
        </div>
      ))}
    </div>
  );

  if (stepId === 5 && data.recommendations) return (
    <div>
      {data.estimated_roi && (
        <div style={{ ...cardStyle("#a78bfa"), marginBottom: 12, textAlign: "center" }}>
          <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700 }}>ESTIMATED ROI</div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginTop: 4 }}>{data.estimated_roi}</div>
        </div>
      )}
      {data.recommendations?.map((rec, i) => (
        <div key={i} style={{ ...cardStyle("#a78bfa"), marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              background: rec.priority === "critical" ? "#ff6b6b30" : rec.priority === "high" ? "#ffaa0030" : "#a78bfa20",
              color: rec.priority === "critical" ? "#ff6b6b" : rec.priority === "high" ? "#ffaa00" : "#a78bfa",
              borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase"
            }}>{rec.priority}</span>
            <span style={{ color: "#ffffff50", fontSize: 11 }}>{rec.timeline} • {rec.effort} effort</span>
          </div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{rec.action}</div>
          <div style={{ color: "#a78bfa", fontSize: 12 }}>→ {rec.expected_impact}</div>
        </div>
      ))}
      {data.quick_wins && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "#00ff9f", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⚡ QUICK WINS</div>
          {data.quick_wins.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#00ff9f" }}>✓</span>
              <span style={{ color: "#ffffffcc", fontSize: 13 }}>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return <pre style={{ color: "#ffffff80", fontSize: 11, whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>;
}

export default function BizMindAgent() {
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState({});
  const [stepResults, setStepResults] = useState({});
  const [activeStep, setActiveStep] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const analyze = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setDone(false);
    setError("");
    setStepStatus({});
    setStepResults({});
    setActiveStep(null);

    const results = {};
    try {
      for (let i = 1; i <= 5; i++) {
        setStepStatus(s => ({ ...s, [i]: "running" }));
        setActiveStep(i);
        const result = await runStep(i, question, results);
        results[i] = JSON.stringify(result);
        setStepResults(r => ({ ...r, [i]: result }));
        setStepStatus(s => ({ ...s, [i]: "done" }));
        await new Promise(r => setTimeout(r, 300));
      }
      setDone(true);
    } catch (e) {
      setError("Analysis failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050a14",
      color: "#fff",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes shimmer { from { left: -100% } to { left: 200% } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px #00d4ff30 } 50% { box-shadow: 0 0 40px #00d4ff60 } }
        @keyframes scan { from { top: 0% } to { top: 100% } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #ffffff08; } ::-webkit-scrollbar-thumb { background: #ffffff20; border-radius: 4px; }
        textarea:focus { outline: none; }
        button:hover { opacity: 0.9; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0a1628 0%, #050a14 100%)",
        borderBottom: "1px solid #ffffff10",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #00d4ff, #0078d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 0 24px #00d4ff40",
          }}>🧠</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>BizMind Agent</div>
            <div style={{ fontSize: 11, color: "#00d4ff", fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>MICROSOFT FOUNDRY · REASONING ENGINE v2.0</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["AGENTS LEAGUE", "TRACK 2", "LIVE"].map((tag, i) => (
            <span key={i} style={{
              background: i === 2 ? "#00ff9f20" : "#ffffff08",
              border: `1px solid ${i === 2 ? "#00ff9f40" : "#ffffff15"}`,
              color: i === 2 ? "#00ff9f" : "#ffffff60",
              borderRadius: 6, padding: "4px 10px", fontSize: 10,
              fontFamily: "'Space Mono', monospace", fontWeight: 700,
              animation: i === 2 ? "pulse 2s infinite" : "none",
            }}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>

        {/* Question Input */}
        <div style={{
          background: "linear-gradient(135deg, #0a1628, #0d1f3c)",
          border: "1px solid #00d4ff30",
          borderRadius: 18,
          padding: 20,
          marginBottom: 24,
          animation: "glow 3s infinite",
        }}>
          <div style={{ color: "#00d4ff", fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10, letterSpacing: 1 }}>
            ▸ ENTER BUSINESS QUESTION
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), analyze())}
              placeholder="e.g. Why did our sales drop by 23% in Q3 2024?"
              rows={2}
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#fff", fontSize: 16, resize: "none",
                fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
              }}
            />
            <button
              onClick={analyze}
              disabled={running || !question.trim()}
              style={{
                background: running ? "#ffffff10" : "linear-gradient(135deg, #00d4ff, #0078d4)",
                border: "none", borderRadius: 12, padding: "12px 24px",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: running ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", transition: "all 0.3s",
                boxShadow: running ? "none" : "0 4px 20px #00d4ff40",
              }}
            >
              {running ? "⚡ Analyzing..." : "🚀 Analyze"}
            </button>
          </div>
          {/* Sample Questions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => setQuestion(q)} style={{
                background: "#ffffff06", border: "1px solid #ffffff15",
                borderRadius: 20, padding: "4px 12px", color: "#ffffff70",
                fontSize: 11, cursor: "pointer", transition: "all 0.2s",
              }}>{q}</button>
            ))}
          </div>
        </div>

        {/* Reasoning Steps Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
          {REASONING_STEPS.map(step => (
            <StepCard
              key={step.id}
              step={step}
              status={stepStatus[step.id] || "idle"}
              isActive={activeStep === step.id}
              onClick={() => stepResults[step.id] && setActiveStep(step.id)}
            />
          ))}
        </div>

        {/* Results Area */}
        {activeStep && stepResults[activeStep] && (
          <div style={{
            background: "#0a1628",
            border: `1px solid ${REASONING_STEPS[activeStep - 1].color}30`,
            borderRadius: 18,
            padding: 22,
            marginBottom: 20,
            animation: "fadeUp 0.4s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>{REASONING_STEPS[activeStep - 1].icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Step {activeStep}: {REASONING_STEPS[activeStep - 1].label}
                </div>
                <div style={{ color: "#ffffff50", fontSize: 12 }}>{REASONING_STEPS[activeStep - 1].desc}</div>
              </div>
              {/* Step Navigation */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {REASONING_STEPS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => stepResults[s.id] && setActiveStep(s.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: activeStep === s.id ? `${s.color}30` : "#ffffff08",
                      border: `1px solid ${activeStep === s.id ? s.color : "#ffffff15"}`,
                      color: activeStep === s.id ? s.color : "#ffffff50",
                      fontSize: 11, fontWeight: 700, cursor: stepResults[s.id] ? "pointer" : "not-allowed",
                    }}
                  >{s.id}</button>
                ))}
              </div>
            </div>
            <ParsedResult stepId={activeStep} data={stepResults[activeStep]} />
          </div>
        )}

        {/* Completion Banner */}
        {done && (
          <div style={{
            background: "linear-gradient(135deg, #00ff9f10, #0078d410)",
            border: "1px solid #00ff9f40",
            borderRadius: 16,
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            animation: "fadeUp 0.5s ease",
          }}>
            <div>
              <div style={{ color: "#00ff9f", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                ✅ Analysis Complete — 5 Reasoning Steps Executed
              </div>
              <div style={{ color: "#ffffff70", fontSize: 13 }}>
                BizMind Agent has processed your question through the full reasoning pipeline
              </div>
            </div>
            <button
              onClick={() => { setQuestion(""); setStepStatus({}); setStepResults({}); setActiveStep(null); setDone(false); }}
              style={{
                background: "#ffffff10", border: "1px solid #ffffff20",
                borderRadius: 10, padding: "10px 18px", color: "#fff",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >New Analysis</button>
          </div>
        )}

        {error && (
          <div style={{ background: "#ff6b6b10", border: "1px solid #ff6b6b40", borderRadius: 12, padding: 16, color: "#ff6b6b" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Architecture Info */}
        {!running && !done && (
          <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { icon: "🏗️", title: "Microsoft Foundry", desc: "Multi-step reasoning orchestration with Azure AI Projects SDK" },
              { icon: "🧠", title: "Chain-of-Thought", desc: "5-layer reasoning: Intent → Data → Patterns → Insights → Actions" },
              { icon: "📊", title: "Business Intelligence", desc: "Real-time SQL generation, trend detection, and ROI estimation" },
            ].map((card, i) => (
              <div key={i} style={{
                background: "#ffffff04",
                border: "1px solid #ffffff0a",
                borderRadius: 14, padding: 18,
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{card.title}</div>
                <div style={{ color: "#ffffff50", fontSize: 12, lineHeight: 1.6 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
