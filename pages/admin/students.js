import { useState, useEffect } from 'react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', class_id: '' });
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [studentsRes, classesRes] = await Promise.all([
      fetch('/api/students-all'),
      fetch('/api/classes-all')
    ]);
    const studentsData = await studentsRes.json();
    const classesData = await classesRes.json();
    const sorted = (studentsData.students || []).sort((a, b) => a.sort_order - b.sort_order);
    setStudents(sorted);
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
    const classStudents = students.filter(s => s.class_id === newStudent.class_id);
    const maxOrder = classStudents.length > 0 ? Math.max(...classStudents.map(s => s.sort_order || 0)) : 0;
    const res = await fetch('/api/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStudent, sort_order: maxOrder + 1 })
    });
    const data = await res.json();
    setStudents(prev => [...prev, data[0]]);
    setNewStudent({ name: '', class_id: '' });
    setShowAddForm(false);
  }

  async function moveStudent(studentId, direction) {
    const classId = students.find(s => s.id === studentId)?.class_id;
    const classStudents = students
      .filter(s => s.class_id === classId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = classStudents.findIndex(s => s.id === studentId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= classStudents.length) return;

    const a = classStudents[idx];
    const b = classStudents[swapIdx];
    const newOrderA = b.sort_order;
    const newOrderB = a.sort_order;

    // UI 즉시 반영
    setStudents(prev => prev.map(s => {
      if (s.id === a.id) return { ...s, sort_order: newOrderA };
      if (s.id === b.id) return { ...s, sort_order: newOrderB };
      return s;
    }));

    // DB 저장
    await Promise.all([
      fetch('/api/students/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: newOrderA })
      }),
      fetch('/api/students/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: newOrderB })
      })
    ]);
  }

  // 반별로 그룹핑
  const grouped = classes.map(cls => ({
    ...cls,
    students: students
      .filter(s => s.class_id === cls.id)
      .sort((a, b) => a.sort_order - b.sort_order)
  })).filter(cls => {
    if (selectedClass !== 'all' && cls.id !== selectedClass) return false;
    if (search) return cls.students.some(s => s.name.includes(search));
    return cls.students.length > 0;
  });

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">학생 관리</h1>

      {/* 필터 + 추가 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="border rounded px-3 py-2 flex-1 min-w-[150px]"
          placeholder="학생 이름 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          <option value="all">전체 반</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + 학생 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 flex gap-3 items-end flex-wrap">
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
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleAdd}>저장</button>
          <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowAddForm(false)}>취소</button>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">총 {students.length}명</p>

      {/* 반별 목록 */}
      {grouped.map(cls => {
        const classStudents = search
          ? cls.students.filter(s => s.name.includes(search))
          : cls.students;

        return (
          <div key={cls.id} className="mb-6 border rounded overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-semibold flex justify-between">
              <span>{cls.name}</span>
              <span className="text-gray-500 text-sm">{classStudents.length}명</span>
            </div>
            <table className="w-full">
              <tbody>
                {classStudents.map((student, idx) => (
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
                          <button className="text-green-600 text-sm hover:underline" onClick={() => handleUpdate(student.id)}>저장</button>
                          <button className="text-gray-500 text-sm hover:underline" onClick={() => setEditingId(null)}>취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium w-8 text-gray-400 text-sm">{idx + 1}</td>
                        <td className="p-3 font-medium">{student.name}</td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            className="text-gray-400 hover:text-gray-700 px-1"
                            onClick={() => moveStudent(student.id, 'up')}
                            disabled={idx === 0}
                          >▲</button>
                          <button
                            className="text-gray-400 hover:text-gray-700 px-1"
                            onClick={() => moveStudent(student.id, 'down')}
                            disabled={idx === classStudents.length - 1}
                          >▼</button>
                        </td>
                        <td className="p-3 text-center space-x-3">
                          <button
                            className="text-blue-600 text-sm hover:underline"
                            onClick={() => { setEditingId(student.id); setEditForm({ name: student.name, class_id: student.class_id }); }}
                          >수정</button>
                          <button
                            className="text-red-500 text-sm hover:underline"
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
        );
      })}
    </div>
  );
}
