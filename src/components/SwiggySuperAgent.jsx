import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  DEFAULT_GROUP_MEMBERS,
  DIETARY_RESTRICTIONS,
  AVATAR_PALETTE,
  WEEKLY_BUDGET_LIMIT,
  WEEKLY_BUDGET_SPENT_SO_FAR,
  getRestrictionLabel,
} from '../data/mockData.js';
import { runSuperAgent } from '../lib/agents.js';

const GROUPS_STORAGE_KEY = 'swiggy_demo_groups_v1';
const ACTIVE_GROUP_STORAGE_KEY = 'swiggy_demo_active_group_v1';

function genId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultGroups() {
  return [{ id: genId('group'), name: 'The Squad', members: DEFAULT_GROUP_MEMBERS.map((m) => ({ ...m })) }];
}

function loadGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* fall through to defaults */
  }
  return createDefaultGroups();
}

function loadActiveGroupId(groups) {
  try {
    const stored = localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
    if (stored && groups.some((g) => g.id === stored)) return stored;
  } catch {
    /* fall through to default */
  }
  return groups[0].id;
}

const EXAMPLE_PROMPTS = [
  'Order dinner for the group tonight',
  'Get biryani for everyone, nothing too spicy',
  'Something light and cheap for lunch',
  'We are celebrating — order something special',
];

const AGENT_META = {
  intent: {
    title: 'Agent 1 · Intent Parser',
    desc: 'Understanding who, what, and why',
    icon: '🧠',
  },
  restaurant: {
    title: 'Agent 2 · Restaurant Matcher',
    desc: 'Matching a spot everyone can eat at',
    icon: '🍽️',
  },
  budget: {
    title: 'Agent 3 · Budget Guardian',
    desc: 'Checking the weekly budget',
    icon: '💰',
  },
};

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function SwiggySuperAgent() {
  const [screen, setScreen] = useState('home'); // home | listening | processing | confirm | success | groups
  const [groups, setGroups] = useState(() => loadGroups());
  const [activeGroupId, setActiveGroupId] = useState(() => loadActiveGroupId(groups));
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [finalRequest, setFinalRequest] = useState('');
  const [agentStatus, setAgentStatus] = useState({ intent: 'pending', restaurant: 'pending', budget: 'pending' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('swiggy_demo_anthropic_key') || '';
    } catch {
      return '';
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micError, setMicError] = useState('');

  const recognitionRef = useRef(null);
  const abortRef = useRef(null);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
    } catch {
      /* localStorage unavailable — groups still work for this session */
    }
  }, [groups]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, activeGroupId);
    } catch {
      /* localStorage unavailable — selection still works for this session */
    }
  }, [activeGroupId]);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setMicError('Voice input is not supported in this browser. Please type your request instead.');
      return;
    }
    setMicError('');
    setTranscript('');
    setScreen('listening');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      setMicError(`Mic error: ${event.error}. Try typing instead.`);
      setScreen('home');
    };

    recognition.onend = () => {
      setTranscript((current) => {
        if (current && current.trim()) {
          submitRequest(current.trim());
        } else {
          setScreen('home');
        }
        return current;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const submitRequest = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    setError('');
    setFinalRequest(text.trim());
    setInputText('');
    setScreen('processing');
    setAgentStatus({ intent: 'pending', restaurant: 'pending', budget: 'pending' });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await runSuperAgent(text.trim(), apiKey, activeGroup.members, {
        signal: controller.signal,
        onAgentUpdate: (id, status) => {
          setAgentStatus((prev) => ({ ...prev, [id]: status }));
        },
      });
      setResult(data);
      // brief pause so the user can see all three agents finish before the card appears
      setTimeout(() => setScreen('confirm'), 500);
    } catch (err) {
      console.error(err);
      setError('Something went wrong pulling this order together. Please try again.');
      setScreen('home');
    }
  }, [apiKey, activeGroup]);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    submitRequest(inputText);
  };

  const handleConfirmOrder = () => {
    setScreen('success');
  };

  const resetAll = () => {
    setScreen('home');
    setResult(null);
    setFinalRequest('');
    setTranscript('');
    setInputText('');
    setError('');
  };

  const saveApiKey = (key) => {
    setApiKey(key);
    try {
      if (key) localStorage.setItem('swiggy_demo_anthropic_key', key);
      else localStorage.removeItem('swiggy_demo_anthropic_key');
    } catch {
      /* localStorage unavailable — key still works for this session */
    }
  };

  const updateGroup = (groupId, updater) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? updater(g) : g)));
  };

  const renameGroup = (groupId, name) => {
    updateGroup(groupId, (g) => ({ ...g, name }));
  };

  const addMember = (groupId) => {
    updateGroup(groupId, (g) => {
      const avatar = AVATAR_PALETTE[g.members.length % AVATAR_PALETTE.length];
      const newMember = { id: genId('member'), name: `Friend ${g.members.length + 1}`, avatar, restriction: 'none' };
      return { ...g, members: [...g.members, newMember] };
    });
  };

  const removeMember = (groupId, memberId) => {
    updateGroup(groupId, (g) => {
      if (g.members.length <= 1) return g;
      return { ...g, members: g.members.filter((m) => m.id !== memberId) };
    });
  };

  const updateMember = (groupId, memberId, field, value) => {
    updateGroup(groupId, (g) => ({
      ...g,
      members: g.members.map((m) => (m.id === memberId ? { ...m, [field]: value } : m)),
    }));
  };

  const addGroup = (name) => {
    const newGroup = { id: genId('group'), name: name || `Group ${groups.length + 1}`, members: [{ id: genId('member'), name: 'You', avatar: '🧑', restriction: 'none' }] };
    setGroups((prev) => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (groupId) => {
    if (groups.length <= 1) return;
    if (!window.confirm('Delete this group? This cannot be undone.')) return;
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== groupId);
      if (activeGroupId === groupId) setActiveGroupId(next[0].id);
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200 p-3 sm:p-6">
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[850px] sm:max-h-[92vh] bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-black/5">
        <TopBar onOpenSettings={() => setShowSettings(true)} />

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {screen === 'home' && (
            <HomeScreen
              activeGroup={activeGroup}
              onManageGroups={() => setScreen('groups')}
              inputText={inputText}
              setInputText={setInputText}
              onTextSubmit={handleTextSubmit}
              onMicPress={startListening}
              speechSupported={speechSupported}
              micError={micError}
              error={error}
              onExample={(p) => submitRequest(p)}
            />
          )}

          {screen === 'groups' && (
            <GroupManagerScreen
              groups={groups}
              activeGroupId={activeGroupId}
              onSelectGroup={setActiveGroupId}
              onRenameGroup={renameGroup}
              onAddMember={addMember}
              onRemoveMember={removeMember}
              onUpdateMember={updateMember}
              onAddGroup={addGroup}
              onDeleteGroup={deleteGroup}
              onDone={() => setScreen('home')}
            />
          )}

          {screen === 'listening' && (
            <ListeningScreen transcript={transcript} onStop={stopListening} onCancel={() => { stopListening(); setScreen('home'); }} />
          )}

          {screen === 'processing' && (
            <ProcessingScreen finalRequest={finalRequest} agentStatus={agentStatus} />
          )}

          {screen === 'confirm' && result && (
            <ConfirmScreen result={result} onConfirm={handleConfirmOrder} onBack={resetAll} finalRequest={finalRequest} />
          )}

          {screen === 'success' && result && (
            <SuccessScreen result={result} onPlaceAnother={resetAll} />
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsModal apiKey={apiKey} onSave={saveApiKey} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function TopBar({ onOpenSettings }) {
  return (
    <div className="bg-swiggy px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg font-extrabold text-white">S</div>
        <div>
          <div className="text-white font-extrabold leading-tight text-[15px]">Swiggy Super Agent</div>
          <div className="text-white/80 text-[11px] leading-tight">Group ordering, on autopilot</div>
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white text-lg"
        aria-label="Settings"
      >
        ⚙️
      </button>
    </div>
  );
}

function BudgetChip() {
  const remaining = WEEKLY_BUDGET_LIMIT - WEEKLY_BUDGET_SPENT_SO_FAR;
  const pct = Math.min(100, Math.round((WEEKLY_BUDGET_SPENT_SO_FAR / WEEKLY_BUDGET_LIMIT) * 100));
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-swiggy-ink">Weekly food budget</span>
        <span className="text-swiggy-sub">₹{WEEKLY_BUDGET_SPENT_SO_FAR} / ₹{WEEKLY_BUDGET_LIMIT}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full bg-swiggy rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-swiggy-sub mt-1">₹{remaining} left this week</div>
    </div>
  );
}

function GroupRow({ members }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
      {members.map((m) => (
        <div key={m.id} className="shrink-0 flex flex-col items-center gap-1 bg-white border border-neutral-200 rounded-2xl px-3 py-2 min-w-[74px]">
          <div className="text-2xl">{m.avatar}</div>
          <div className="text-[11px] font-semibold text-swiggy-ink">{m.name}</div>
          <div className="text-[9px] text-swiggy-sub text-center leading-tight">{getRestrictionLabel(m.restriction)}</div>
        </div>
      ))}
    </div>
  );
}

function HomeScreen({ activeGroup, onManageGroups, inputText, setInputText, onTextSubmit, onMicPress, speechSupported, micError, error, onExample }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-extrabold text-swiggy-ink">Tonight's group order 🍴</h2>
        <p className="text-sm text-swiggy-sub mt-0.5">Speak or type your request — 3 AI agents handle the rest.</p>
      </div>

      <div className="flex items-center justify-between -mb-1">
        <span className="text-xs font-semibold text-swiggy-sub">
          Ordering for <span className="text-swiggy-ink">{activeGroup.name}</span> · {activeGroup.members.length} {activeGroup.members.length === 1 ? 'person' : 'people'}
        </span>
        <button onClick={onManageGroups} className="text-xs font-bold text-swiggy-darker active:scale-95 transition">
          Manage ✎
        </button>
      </div>

      <GroupRow members={activeGroup.members} />
      <BudgetChip />

      <div className="flex flex-col items-center py-4">
        <button
          onClick={onMicPress}
          className="relative w-24 h-24 rounded-full bg-swiggy shadow-lg shadow-orange-300/50 flex items-center justify-center active:scale-95 transition"
          aria-label="Speak your order"
        >
          <span className="text-4xl">🎙️</span>
        </button>
        <p className="text-xs text-swiggy-sub mt-3">
          {speechSupported ? 'Tap to speak your order' : 'Voice not supported here — type below'}
        </p>
        {micError && <p className="text-xs text-red-500 mt-1 text-center px-4">{micError}</p>}
        {error && <p className="text-xs text-red-500 mt-1 text-center px-4">{error}</p>}
      </div>

      <form onSubmit={onTextSubmit} className="flex items-center gap-2">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder='e.g. "Order dinner for the group tonight"'
          className="flex-1 rounded-full border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-11 h-11 shrink-0 rounded-full bg-swiggy text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
          aria-label="Send"
        >
          ➤
        </button>
      </form>

      <div>
        <div className="text-xs font-semibold text-swiggy-sub mb-2">Try saying</div>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onExample(p)}
              className="text-left text-sm bg-swiggy-light text-swiggy-darker rounded-xl px-3 py-2.5 hover:bg-orange-100 active:scale-[0.98] transition"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupManagerScreen({
  groups,
  activeGroupId,
  onSelectGroup,
  onRenameGroup,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onAddGroup,
  onDeleteGroup,
  onDone,
}) {
  const [newGroupName, setNewGroupName] = useState('');
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
  };

  return (
    <div className="px-4 py-4 flex flex-col gap-4 animate-slide-up pb-8">
      <div>
        <h2 className="text-lg font-extrabold text-swiggy-ink">Your groups</h2>
        <p className="text-sm text-swiggy-sub mt-0.5">Create groups and set each person's dietary preference.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            className={`shrink-0 rounded-2xl px-3 py-2 text-left border transition ${
              g.id === activeGroupId ? 'bg-swiggy border-swiggy text-white' : 'bg-white border-neutral-200 text-swiggy-ink'
            }`}
          >
            <div className="text-sm font-bold">{g.name}</div>
            <div className={`text-[10px] ${g.id === activeGroupId ? 'text-white/80' : 'text-swiggy-sub'}`}>{g.members.length} people</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={activeGroup.name}
            onChange={(e) => onRenameGroup(activeGroup.id, e.target.value)}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold text-swiggy-ink focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
          />
          {groups.length > 1 && (
            <button
              onClick={() => onDeleteGroup(activeGroup.id)}
              className="w-9 h-9 shrink-0 rounded-full border border-red-200 text-red-500 flex items-center justify-center active:scale-95 transition"
              aria-label="Delete group"
            >
              🗑
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {activeGroup.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5">
              <div className="text-xl shrink-0">{member.avatar}</div>
              <input
                value={member.name}
                onChange={(e) => onUpdateMember(activeGroup.id, member.id, 'name', e.target.value)}
                className="w-20 min-w-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm font-semibold text-swiggy-ink focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
              />
              <select
                value={member.restriction}
                onChange={(e) => onUpdateMember(activeGroup.id, member.id, 'restriction', e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-swiggy-ink focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
              >
                {DIETARY_RESTRICTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={() => onRemoveMember(activeGroup.id, member.id)}
                disabled={activeGroup.members.length <= 1}
                className="w-8 h-8 shrink-0 rounded-full border border-neutral-300 text-swiggy-sub flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
                aria-label={`Remove ${member.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => onAddMember(activeGroup.id)}
          className="text-sm font-semibold text-swiggy-darker bg-swiggy-light rounded-xl px-3 py-2.5 active:scale-[0.98] transition"
        >
          + Add member
        </button>
      </div>

      <form onSubmit={handleCreateGroup} className="flex items-center gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name (e.g. Roommates)"
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
        />
        <button
          type="submit"
          disabled={!newGroupName.trim()}
          className="px-4 py-2.5 shrink-0 rounded-full bg-swiggy text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition"
        >
          + New group
        </button>
      </form>

      <button onClick={onDone} className="mt-1 py-3 rounded-full bg-swiggy-ink text-white text-sm font-bold active:scale-95 transition">
        Done
      </button>
    </div>
  );
}

function ListeningScreen({ transcript, onStop, onCancel }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10 animate-fade-in">
      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        <span className="absolute inset-0 rounded-full bg-swiggy/40 animate-pulse-ring" />
        <span className="absolute inset-0 rounded-full bg-swiggy/40 animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
        <div className="relative w-24 h-24 rounded-full bg-swiggy flex items-center justify-center text-4xl shadow-lg">
          🎙️
        </div>
      </div>

      <div className="flex items-end gap-1 h-8 mb-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1.5 bg-swiggy rounded-full animate-wave"
            style={{ height: '100%', animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      <p className="text-swiggy-ink font-semibold mb-2">Listening…</p>
      <p className="text-center text-sm text-swiggy-sub min-h-[3rem] max-w-xs">
        {transcript || 'Say something like "order dinner for the group tonight"'}
      </p>

      <div className="flex gap-3 mt-8">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-full border border-neutral-300 text-sm font-semibold text-swiggy-ink active:scale-95 transition">
          Cancel
        </button>
        <button onClick={onStop} className="px-5 py-2.5 rounded-full bg-swiggy text-white text-sm font-semibold active:scale-95 transition">
          Done speaking
        </button>
      </div>
    </div>
  );
}

function ProcessingScreen({ finalRequest, agentStatus }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4 animate-fade-in">
      <div className="bg-neutral-100 rounded-2xl px-4 py-3">
        <div className="text-[11px] text-swiggy-sub font-semibold mb-1">YOUR REQUEST</div>
        <div className="text-sm text-swiggy-ink font-medium">"{finalRequest}"</div>
      </div>

      <div className="text-sm font-semibold text-swiggy-ink mt-1">3 agents working in parallel…</div>

      <div className="flex flex-col gap-3">
        {Object.entries(AGENT_META).map(([id, meta]) => (
          <AgentCard key={id} meta={meta} status={agentStatus[id]} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ meta, status }) {
  const isDone = status === 'live' || status === 'simulated';
  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300 ${
        isDone ? 'border-green-200 bg-green-50/60' : 'border-neutral-200 bg-white'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${isDone ? 'bg-green-100' : 'bg-swiggy-light'}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-swiggy-ink">{meta.title}</div>
        <div className="text-xs text-swiggy-sub truncate">{meta.desc}</div>
      </div>
      <div className="shrink-0">
        {isDone ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm animate-pop-in">✓</span>
            <span className="text-[9px] text-swiggy-sub">{status === 'live' ? 'Live Claude' : 'Simulated'}</span>
          </div>
        ) : (
          <span className="w-6 h-6 border-2 border-swiggy/30 border-t-swiggy rounded-full animate-spin-slow inline-block" />
        )}
      </div>
    </div>
  );
}

const BUDGET_STYLES = {
  within_budget: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500', label: 'Within budget' },
  tight: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', label: 'Budget getting tight' },
  over_budget: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500', label: 'Over weekly budget' },
};

function ConfirmScreen({ result, onConfirm, onBack, finalRequest }) {
  const { restaurant, reasoning, perPerson, subtotal, deliveryFee, platformFee, gst, total, perPersonSplit, budget } = result;
  const style = BUDGET_STYLES[budget.status] || BUDGET_STYLES.within_budget;
  const spentPct = Math.min(100, Math.round(((budget.spentSoFar + total) / budget.limit) * 100));

  return (
    <div className="px-4 py-4 flex flex-col gap-4 animate-slide-up pb-6">
      <div className="text-xs text-swiggy-sub">Based on: <span className="italic">"{finalRequest}"</span></div>

      <div className="rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="bg-swiggy-light px-4 py-3 flex items-center gap-3">
          <div className="text-3xl">{restaurant.image}</div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-swiggy-ink leading-tight">{restaurant.name}</div>
            <div className="text-xs text-swiggy-sub truncate">{restaurant.cuisine}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">★ {restaurant.rating}</span>
            <span className="text-[11px] text-swiggy-sub">{restaurant.deliveryTime} min</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-neutral-100 bg-white">
          <p className="text-xs text-swiggy-sub leading-relaxed">
            <span className="font-semibold text-swiggy-ink">Why this spot: </span>
            {reasoning}
          </p>
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-swiggy-ink mb-2">Recommended for each person</div>
        <div className="flex flex-col gap-2">
          {perPerson.map(({ member, dish }) => (
            <div key={member.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-3 py-2.5">
              <div className="text-xl">{member.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-swiggy-ink">{member.name} <span className="text-[10px] font-normal text-swiggy-sub">· {getRestrictionLabel(member.restriction)}</span></div>
                <div className="text-xs text-swiggy-sub truncate">{dish ? dish.name : '—'}</div>
              </div>
              <div className="text-sm font-bold text-swiggy-ink shrink-0">₹{dish ? dish.price : 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-4 bg-white">
        <div className="text-sm font-bold text-swiggy-ink mb-2">Bill summary</div>
        <div className="flex flex-col gap-1.5 text-sm text-swiggy-sub">
          <Row label="Item total" value={`₹${subtotal}`} />
          <Row label="Delivery fee" value={`₹${deliveryFee}`} />
          <Row label="Platform fee" value={`₹${platformFee}`} />
          <Row label="GST" value={`₹${gst}`} />
        </div>
        <div className="h-px bg-neutral-200 my-2.5" />
        <Row label={<span className="font-bold text-swiggy-ink">Total</span>} value={<span className="font-extrabold text-swiggy-ink">₹{total}</span>} />
        <div className="flex items-center justify-between mt-3 bg-swiggy-light rounded-xl px-3 py-2.5">
          <span className="text-sm font-semibold text-swiggy-darker">Per-person split (÷{perPerson.length})</span>
          <span className="text-base font-extrabold text-swiggy-darker">₹{perPersonSplit}</span>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
          <span className={`text-xs font-semibold ${style.text}`}>₹{Math.max(budget.remainingAfterOrder, 0)} left after order</span>
        </div>
        <div className="h-2 rounded-full bg-white/70 overflow-hidden mb-2">
          <div className={`h-full ${style.bar} rounded-full transition-all duration-700`} style={{ width: `${spentPct}%` }} />
        </div>
        <p className={`text-xs ${style.text}`}>{budget.message}</p>
        {budget.suggestion && <p className={`text-xs mt-1 ${style.text} opacity-80`}>💡 {budget.suggestion}</p>}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex-1 py-3 rounded-full border border-neutral-300 text-sm font-semibold text-swiggy-ink active:scale-95 transition">
          Start over
        </button>
        <button onClick={onConfirm} className="flex-[2] py-3 rounded-full bg-swiggy text-white text-sm font-bold shadow-lg shadow-orange-300/50 active:scale-95 transition">
          Confirm & Place Order · ₹{total}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SuccessScreen({ result, onPlaceAnother }) {
  const { restaurant, total, perPersonSplit } = result;
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10 text-center animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 animate-pop-in shadow-lg shadow-green-300/50">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            className="animate-check-draw"
          />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-swiggy-ink mb-1">Order placed!</h2>
      <p className="text-sm text-swiggy-sub max-w-xs mb-6">
        Your group order from <span className="font-semibold text-swiggy-ink">{restaurant.name}</span> is being prepared.
      </p>

      <div className="w-full max-w-xs rounded-2xl border border-neutral-200 bg-white p-4 mb-6 text-left">
        <Row label={<span className="text-swiggy-sub text-sm">Restaurant</span>} value={<span className="text-sm font-semibold text-swiggy-ink">{restaurant.name}</span>} />
        <Row label={<span className="text-swiggy-sub text-sm">Est. delivery</span>} value={<span className="text-sm font-semibold text-swiggy-ink">{restaurant.deliveryTime} min</span>} />
        <Row label={<span className="text-swiggy-sub text-sm">Total paid</span>} value={<span className="text-sm font-semibold text-swiggy-ink">₹{total}</span>} />
        <Row label={<span className="text-swiggy-sub text-sm">Per person</span>} value={<span className="text-sm font-semibold text-swiggy-ink">₹{perPersonSplit}</span>} />
      </div>

      <div className="flex items-center gap-1.5 text-swiggy-sub text-xs mb-8 animate-float">
        <span>🛵</span> Rider will be assigned shortly
      </div>

      <button onClick={onPlaceAnother} className="px-6 py-3 rounded-full bg-swiggy text-white text-sm font-bold shadow-lg shadow-orange-300/50 active:scale-95 transition">
        Place another order
      </button>
    </div>
  );
}

function SettingsModal({ apiKey, onSave, onClose }) {
  const [value, setValue] = useState(apiKey);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-extrabold text-swiggy-ink">Live AI settings</h3>
          <button onClick={onClose} className="text-swiggy-sub text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-swiggy-sub mb-4 leading-relaxed">
          Optional. Add an Anthropic API key to have all 3 agents call Claude
          (<code className="bg-neutral-100 px-1 rounded">claude-sonnet-4-6</code>) live via <code className="bg-neutral-100 px-1 rounded">Promise.all</code>.
          Leave blank to run the demo in realistic simulation mode — no key needed. Stored only in this browser.
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-swiggy/40 focus:border-swiggy"
        />
        <div className="flex gap-3">
          <button
            onClick={() => { onSave(''); setValue(''); }}
            className="flex-1 py-2.5 rounded-full border border-neutral-300 text-sm font-semibold text-swiggy-ink active:scale-95 transition"
          >
            Clear
          </button>
          <button
            onClick={() => { onSave(value.trim()); onClose(); }}
            className="flex-1 py-2.5 rounded-full bg-swiggy text-white text-sm font-bold active:scale-95 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
