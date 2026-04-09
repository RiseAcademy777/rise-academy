import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', teacher_id: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', teacher_id: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch('/api/teachers-all');
    const data = await res.json();
    const sorted = (data.classes || []).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    setClasses(sorted);
    setTeachers(data.teachers || []);
    setLoading(false);
  }

  function getTeacherName(teacher_id) {
    if (!teacher_id) return '미배정';
    return teachers.find(t => t.id === teacher_id)?.name || '미배정';
  }

  async function handleAdd() {
    if (!newClass.name) return alert('반 이름을 입력해주세요');
    setSaving(true);
    const res = await fetch('/api/classes/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClass.name, teacher_id: newClass.teacher_id || null })
    });
    const data = await res.json();
    if (data[0]) {
      setClasses(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
    }
    setNewClass({ name: '', teacher_id: '' });
    setShowAddForm(false);
    setSaving(false);
  }

  async function handleUpdate(id) {
    await fetch('/api/classes/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editForm.name, teacher_id: editForm.teacher_id || null })
    });
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c));
    setEditingId(null);
  }

  async function handleDelete(id, name) {
    if (!confirm(`"${name}" 반을 삭제할까요?\n학생 데이터는 유지됩니다.`)) return;
    await fetch('/api/classes/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setClasses(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>;

  return (
    <>
      <Head><title>반 관리 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => router.push('/admin')} className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">←</span>
              <span className="text-sm font-semibold text-gray-900">반 관리</span>
            </button>
            <button
              className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              + 반 개설
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

          {/* 반 추가 폼 */}
          {showAddForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800">새 반 개설</p>
              <div className="space-y-2">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="반 이름 (예: MK 8세 블루)"
                  value={newClass.name}
                  onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                />
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={newClass.teacher_id}
                  onChange={e => setNewClass({ ...newClass, teacher_id: e.target.value })}
                >
                  <option value="">담당 선생님 선택 (선택사항)</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.role === 'director' ? '원장' : '강사'})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                  onClick={handleAdd}
                  disabled={saving}
                >{saving ? '저장 중...' : '개설'}</button>
                <button
                  className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg"
                  onClick={() => setShowAddForm(false)}
                >취소</button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">전체 {classes.length}개 반</p>

          {/* 반 목록 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {classes.map((cls, idx) => (
              <div key={cls.id} className={`p-4 flex items-center justify-between gap-3 ${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
                {editingId === cls.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <select
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={editForm.teacher_id || ''}
                      onChange={e => setEditForm({ ...editForm, teacher_id: e.target.value })}
                    >
                      <option value="">담당 선생님 없음</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.role === 'director' ? '원장' : '강사'})</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button className="text-green-600 text-sm font-medium" onClick={() => handleUpdate(cls.id)}>저장</button>
                      <button className="text-gray-400 text-sm" onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        담당: <span className={cls.teacher_id ? 'text-blue-600' : 'text-red-400'}>{getTeacherName(cls.teacher_id)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        className="text-blue-600 text-xs"
                        onClick={() => { setEditingId(cls.id); setEditForm({ name: cls.name, teacher_id: cls.teacher_id || '' }); }}
                      >수정</button>
                      <button
                        className="text-red-400 text-xs"
                        onClick={() => handleDelete(cls.id, cls.name)}
                      >삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
