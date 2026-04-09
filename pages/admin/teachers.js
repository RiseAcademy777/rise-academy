import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [assigningClass, setAssigningClass] = useState(null);
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch('/api/teachers-all');
    const data = await res.json();
    setTeachers(data.teachers || []);
    setClasses(data.classes || []);
    setLoading(false);
  }

  function getTeacherClasses(teacherId) {
    return classes.filter(c => c.teacher_id === teacherId);
  }

  function getUnassignedClasses() {
    return classes.filter(c => !c.teacher_id);
  }

  async function assignClass(classId, teacherId) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    await fetch('/api/classes/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, teacherId })
    });
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, teacher_id: teacherId } : c));
    setAssigningClass(null);
  }

  async function unassignClass(classId) {
    await fetch('/api/classes/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, teacherId: null })
    });
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, teacher_id: null } : c));
  }

  async function handleAddTeacher() {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) return alert('모든 항목을 입력해주세요');
    setSaving(true);
    const res = await fetch('/api/teachers/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTeacher)
    });
    const data = await res.json();
    if (data.error) { alert('오류: ' + data.error); setSaving(false); return; }
    await fetchData();
    setNewTeacher({ name: '', email: '', password: '' });
    setShowAddForm(false);
    setSaving(false);
  }

  async function handleDeleteTeacher(id, name) {
    if (!confirm(`"${name}" 강사를 삭제할까요?\n배정된 반은 미배정 상태가 됩니다.`)) return;
    await fetch('/api/teachers/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setTeachers(prev => prev.filter(t => t.id !== id));
    setClasses(prev => prev.map(c => c.teacher_id === id ? { ...c, teacher_id: null } : c));
  }

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>;

  return (
    <>
      <Head><title>강사 관리 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => router.push('/admin')} className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">←</span>
              <span className="text-sm font-semibold text-gray-900">강사 관리</span>
            </button>
            <button
              className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              + 강사 추가
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          {/* 강사 추가 폼 */}
          {showAddForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800">새 강사 등록</p>
              <div className="grid grid-cols-1 gap-2">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="이름"
                  value={newTeacher.name}
                  onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="이메일 (로그인 ID)"
                  type="email"
                  value={newTeacher.email}
                  onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="초기 비밀번호"
                  type="password"
                  value={newTeacher.password}
                  onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                  onClick={handleAddTeacher}
                  disabled={saving}
                >{saving ? '저장 중...' : '등록'}</button>
                <button
                  className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg"
                  onClick={() => setShowAddForm(false)}
                >취소</button>
              </div>
            </div>
          )}

          {/* 미배정 반 */}
          {getUnassignedClasses().length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ 미배정 반 ({getUnassignedClasses().length}개)</p>
              <div className="flex flex-wrap gap-2">
                {getUnassignedClasses().map(c => (
                  <div key={c.id} className="flex items-center gap-1 bg-white border border-yellow-200 rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-700">{c.name}</span>
                    <select
                      className="text-xs border-none bg-transparent text-blue-600 cursor-pointer"
                      defaultValue=""
                      onChange={e => e.target.value && assignClass(c.id, e.target.value)}
                    >
                      <option value="">배정▼</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 강사 목록 */}
          <p className="text-xs text-gray-400">강사 {teachers.length}명</p>

          {teachers.map(teacher => {
            const myClasses = getTeacherClasses(teacher.id);
            return (
              <div key={teacher.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-700">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
                      <p className="text-xs text-gray-400">{teacher.role === 'director' ? '원장' : '강사'} · 반 {myClasses.length}개</p>
                    </div>
                  </div>
                  {teacher.role !== 'director' && (
                    <button
                      className="text-red-400 text-xs"
                      onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                    >삭제</button>
                  )}
                </div>

                {/* 배정된 반 */}
                <div className="flex flex-wrap gap-2">
                  {myClasses.map(c => (
                    <div key={c.id} className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1">
                      <span className="text-xs text-blue-700">{c.name}</span>
                      <button
                        className="text-blue-300 hover:text-red-400 text-xs ml-1"
                        onClick={() => unassignClass(c.id)}
                      >✕</button>
                    </div>
                  ))}
                  {/* 반 추가 */}
                  {assigningClass === teacher.id ? (
                    <select
                      className="text-xs border rounded-lg px-2 py-1 text-gray-600"
                      defaultValue=""
                      onChange={e => e.target.value && assignClass(e.target.value, teacher.id)}
                    >
                      <option value="">반 선택...</option>
                      {getUnassignedClasses().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <button
                      className="text-xs border border-dashed border-gray-300 rounded-lg px-2 py-1 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                      onClick={() => setAssigningClass(teacher.id)}
                    >+ 반 배정</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
