import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function TeacherPage() {
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [links, setLinks] = useState({});
  const [gen, setGen] = useState({});
  const [copied, setCopied] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', class_id: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '' });
  const [search, setSearch] = useState('');
  const router = useRouter();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  useEffect(() => {
    Promise.all([
      fetch('/api/students-all').then(r => r.json()),
      fetch('/api/classes-all').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([studentsData, classesData, authData]) => {
      const sorted = (studentsData.students || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setStudents(sorted);
      setClasses(classesData.classes || []);
      if (authData.teacher) setTeacher(authData.teacher);
      else router.push('/login');
      setLoading(false);
    }).catch(() => { router.push('/login'); setLoading(false); });
  }, []);

  function getClassName(class_id) {
    return classes.find(c => c.id === class_id)?.name || '';
  }

  async function generateLink(studentId) {
    setGen(p => ({ ...p, [studentId]: true }));
    const res = await fetch('/api/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    if (res.ok) setLinks(p => ({ ...p, [studentId]: data.token }));
    else alert('링크 생성 실패');
    setGen(p => ({ ...p, [studentId]: false }));
  }

  function copyLink(studentId, token) {
    navigator.clipboard.writeText(`${siteUrl}/r/${token.token}`).then(() => {
      setCopied(p => ({ ...p, [studentId]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [studentId]: false })), 2500);
    });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function getDaysLeft(exp) {
    return Math.max(0, Math.ceil((new Date(exp) - new Date()) / 86400000));
  }

  async function handleDelete(id, name) {
    if (!confirm(`"${name}" 학생을 삭제할까요?`)) return;
    await fetch('/api/students/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  async function handleUpdate(id) {
    await fetch('/api/students/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm })
    });
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
    setEditingId(null);
  }

  async function handleAdd() {
    if (!newStudent.name || !newStudent.class_id) return alert('이름과 반을 입력해주세요');
    const classStudents = students.filter(s => s.class_id === newStudent.class_id);
    const maxOrder = classStudents.length > 0 ? Math.max(...classStudents.map(s => s.sort_order || 0)) : 0;
    const res = await fetch('/api/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStudent, sort_order: maxOrder + 1 })
    });
    const data = await res.json();
    if (data[0]) setStudents(prev => [...prev, data[0]]);
    setNewStudent({ name: '', class_id: '' });
    setShowAddForm(false);
  }

  async function moveStudent(studentId, direction) {
    const classId = students.find(s => s.id === studentId)?.class_id;
    const classStudents = [...students]
      .filter(s => s.class_id === classId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = classStudents.findIndex(s => s.id === studentId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= classStudents.length) return;

    const a = classStudents[idx];
    const b = classStudents[swapIdx];

    // sort_order가 같을 경우 대비해 인덱스 기반으로 재할당
    const reindexed = classStudents.map((s, i) => ({ ...s, sort_order: i * 10 }));
    reindexed[idx].sort_order = swapIdx * 10;
    reindexed[swapIdx].sort_order = idx * 10;

    setStudents(prev => prev.map(s => {
      const updated = reindexed.find(r => r.id === s.id);
      return updated ? { ...s, sort_order: updated.sort_order } : s;
    }));

    await Promise.all([
      fetch('/api/students/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: swapIdx * 10 })
      }),
      fetch('/api/students/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: idx * 10 })
      })
    ]);
  }

  // 반별 그룹핑
  const grouped = classes.map(cls => ({
    ...cls,
    students: students
      .filter(s => s.class_id === cls.id && (!search || s.name.includes(search)))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  })).filter(cls => cls.students.length > 0);

  const isDirector = teacher?.role === 'director';

  return (
    <>
      <Head><title>강사 대시보드 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Rise Language Academy</p>
              <p className="text-sm font-semibold text-gray-900">{teacher?.name || '...'} 선생님</p>
            </div>
            <div className="flex items-center gap-3">
              {isDirector && (
                <button
                  onClick={() => { setAdminMode(!adminMode); setEditingId(null); setShowAddForm(false); }}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${adminMode ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-200'}`}
                >
                  {adminMode ? '✓ 관리 모드' : '학생 관리'}
                </button>
              )}
              <button onClick={logout} className="text-xs text-gray-400">로그아웃</button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* 메뉴 버튼 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '리포트 작성', icon: '📝', href: '/teacher/report' },
              { label: '엑셀 업로드', icon: '📊', href: '/teacher/report/upload' },
              { label: '공지사항', icon: '📢', href: '/teacher/notice' },
              { label: '이번 주 콘텐츠', icon: '📚', href: '/teacher/content' },
            ].map(m => (
              <button key={m.href} onClick={() => router.push(m.href)}
                className="bg-white rounded-xl border border-gray-200 p-3 text-center hover:border-gray-300">
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="text-xs text-gray-600 font-medium">{m.label}</div>
              </button>
            ))}
          </div>

          {!adminMode && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
              <strong>링크 사용법</strong> · 학생 이름 옆 "링크 생성" → "복사" → 카카오톡 전송 · 링크는 <strong>10일간 유효</strong>
            </div>
          )}

          {loading && <p className="text-center text-sm text-gray-400 py-8">불러오는 중...</p>}

          {!loading && (
            <>
              {/* 검색 + 추가 버튼 (관리 모드일 때) */}
              {adminMode && (
                <div className="flex gap-2">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm flex-1"
                    placeholder="학생 이름 검색..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <button
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    + 추가
                  </button>
                </div>
              )}

              {/* 학생 추가 폼 */}
              {adminMode && showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">이름</label>
                    <input
                      className="border rounded px-3 py-2 text-sm"
                      value={newStudent.name}
                      onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">반</label>
                    <select
                      className="border rounded px-3 py-2 text-sm"
                      value={newStudent.class_id}
                      onChange={e => setNewStudent({ ...newStudent, class_id: e.target.value })}
                    >
                      <option value="">반 선택</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg" onClick={handleAdd}>저장</button>
                  <button className="bg-gray-400 text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowAddForm(false)}>취소</button>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">전체 {students.length}명</p>

              {/* 관리 모드: 반별 그룹 */}
              {adminMode && grouped.map(cls => (
                <div key={cls.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                    <span className="text-sm font-semibold text-gray-700">{cls.name}</span>
                    <span className="text-xs text-gray-400">{cls.students.length}명</span>
                  </div>
                  {cls.students.map((student, idx) => (
                    <div key={student.id} className="border-t first:border-t-0 p-3">
                      {editingId === student.id ? (
                        <div className="flex gap-2 flex-wrap items-center">
                          <input
                            className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          />
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={editForm.class_id}
                            onChange={e => setEditForm({ ...editForm, class_id: e.target.value })}
                          >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button className="text-green-600 text-sm" onClick={() => handleUpdate(student.id)}>저장</button>
                          <button className="text-gray-400 text-sm" onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moveStudent(student.id, 'up')}
                                disabled={idx === 0}
                                className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                              >▲</button>
                              <button
                                onClick={() => moveStudent(student.id, 'down')}
                                disabled={idx === cls.students.length - 1}
                                className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                              >▼</button>
                            </div>
                            <span className="text-xs text-gray-300 w-4">{idx + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{student.name}</span>
                          </div>
                          <div className="flex gap-3">
                            <button
                              className="text-blue-600 text-xs"
                              onClick={() => { setEditingId(student.id); setEditForm({ name: student.name, class_id: student.class_id }); }}
                            >수정</button>
                            <button
                              className="text-red-500 text-xs"
                              onClick={() => handleDelete(student.id, student.name)}
                            >삭제</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* 일반 모드: 기존 링크 생성 목록 */}
              {!adminMode && students
                .filter(s => !search || s.name.includes(search))
                .map(student => {
                  const token = links[student.id];
                  const daysLeft = token ? getDaysLeft(token.expires_at) : 0;
                  const isValid = token && daysLeft > 0;
                  return (
                    <div key={student.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                            <p className="text-xs text-gray-400">{getClassName(student.class_id)}</p>
                          </div>
                        </div>
                        <button onClick={() => generateLink(student.id)} disabled={gen[student.id]}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white disabled:opacity-50 whitespace-nowrap flex-shrink-0">
                          {gen[student.id] ? '생성 중...' : isValid ? '재발급' : '링크 생성'}
                        </button>
                      </div>
                      {isValid && (
                        <>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 min-w-0 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono truncate border border-gray-100">
                              {siteUrl}/r/{token.token}
                            </div>
                            <button onClick={() => copyLink(student.id, token)}
                              className={`text-xs px-3 py-2 rounded-lg border whitespace-nowrap flex-shrink-0 ${copied[student.id] ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                              {copied[student.id] ? '✓ 복사됨' : '복사'}
                            </button>
                          </div>
                          <p className="mt-1.5 text-xs text-gray-400">{daysLeft}일 후 만료</p>
                        </>
                      )}
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
