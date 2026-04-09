import { useState, useEffect } from 'react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', class_id: '' });
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [studentsRes, classesRes] = await Promise.all([
      fetch('/api/students-all'),
      fetch('/api/classes-all')
    ]);
    const studentsData = await studentsRes.json();
    const classesData = await classesRes.json();
    setStudents(studentsData.students || []);
    setClasses(classesData.classes || []);
    setLoading(false);
  }

  function getClassName(class_id) {
    return classes.find(c => c.id === class_id)?.name || '미배정';
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
    const res = await fetch('/api/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    });
    const data = await res.json();
    setStudents(prev => [...prev, data[0]]);
    setNewStudent({ name: '', class_id: '' });
    setShowAddForm(false);
  }

  const filtered = students.filter(s => s.name.includes(search));

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">학생 관리</h1>

      {/* 검색 + 추가 버튼 */}
      <div className="flex gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="학생 이름 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + 학생 추가
        </button>
      </div>

      {/* 학생 추가 폼 */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 flex gap-3 items-end">
          <div>
            <label className="block text-sm mb-1">이름</label>
            <input
              className="border rounded px-3 py-2"
              value={newStudent.name}
              onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">반</label>
            <select
              className="border rounded px-3 py-2"
              value={newStudent.class_id}
              onChange={e => setNewStudent({ ...newStudent, class_id: e.target.value })}
            >
              <option value="">반 선택</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={handleAdd}>저장</button>
          <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowAddForm(false)}>취소</button>
        </div>
      )}

      {/* 학생 수 */}
      <p className="text-sm text-gray-500 mb-3">총 {filtered.length}명</p>

      {/* 학생 목록 */}
      <div className="border rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">이름</th>
              <th className="text-left p-3">반</th>
              <th className="p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(student => (
              <tr key={student.id} className="border-t hover:bg-gray-50">
                {editingId === student.id ? (
                  <>
                    <td className="p-3">
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td className="p-3">
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={editForm.class_id}
                        onChange={e => setEditForm({ ...editForm, class_id: e.target.value })}
                      >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button className="text-green-600 hover:underline text-sm" onClick={() => handleUpdate(student.id)}>저장</button>
                      <button className="text-gray-500 hover:underline text-sm" onClick={() => setEditingId(null)}>취소</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{student.name}</td>
                    <td className="p-3 text-gray-600">{getClassName(student.class_id)}</td>
                    <td className="p-3 text-center space-x-3">
                      <button
                        className="text-blue-600 hover:underline text-sm"
                        onClick={() => { setEditingId(student.id); setEditForm({ name: student.name, class_id: student.class_id }); }}
                      >수정</button>
                      <button
                        className="text-red-500 hover:underline text-sm"
                        onClick={() => handleDelete(student.id, student.name)}
                      >삭제</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
