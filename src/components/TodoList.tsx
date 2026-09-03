import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  ListTodo,
  Lock
} from 'lucide-react';
import { TodoTask, PriorityLevel, TaskCategory } from '../types';
import { updateTodo, deleteTodo, addTodo, canUserEdit } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

interface TodoListProps {
  todos: TodoTask[];
  onOpenNewTaskModal: () => void;
  onEditTask: (task: TodoTask) => void;
  isReadOnly?: boolean;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onOpenNewTaskModal,
  onEditTask,
  isReadOnly: propReadOnly
}) => {
  const { userProfile } = useAuth();
  const isReadOnly = propReadOnly !== undefined ? propReadOnly : !canUserEdit(userProfile);

  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [filterStatus, setFilterStatus] = useState<'전체' | '진행중' | '완료'>('전체');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('DM발송');
  const [quickPriority, setQuickPriority] = useState<PriorityLevel>('중');
  const [isAddingQuick, setIsAddingQuick] = useState(false);

  const categories: string[] = ['전체', 'DM발송', '반송처리', '만료안내', '입금확인', '기타'];

  // Calculate statistics
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter tasks
  const filteredTodos = todos.filter((t) => {
    const matchesCategory = selectedCategory === '전체' || t.category === selectedCategory;
    const matchesStatus =
      filterStatus === '전체' ||
      (filterStatus === '진행중' && !t.completed) ||
      (filterStatus === '완료' && t.completed);
    return matchesCategory && matchesStatus;
  });

  const handleToggleComplete = async (todo: TodoTask) => {
    if (!todo.id) return;
    try {
      await updateTodo(todo.id, { completed: !todo.completed });
    } catch (err) {
      console.error('Failed to toggle todo status:', err);
    }
  };

  const [todoToDelete, setTodoToDelete] = useState<TodoTask | null>(null);

  const handleConfirmDelete = async () => {
    if (!todoToDelete?.id) return;
    try {
      await deleteTodo(todoToDelete.id);
      setTodoToDelete(null);
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsAddingQuick(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await addTodo({
        title: quickTitle.trim(),
        category: quickCategory,
        dueDate: todayStr,
        priority: quickPriority,
        completed: false,
        assignedTo: '담당자',
        createdAt: todayStr
      });
      setQuickTitle('');
    } catch (err) {
      console.error('Failed to quick add todo:', err);
    } finally {
      setIsAddingQuick(false);
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case '상':
        return <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-md border border-red-200">우선순위 상</span>;
      case '중':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-md border border-amber-200">우선순위 중</span>;
      case '하':
      default:
        return <span className="px-2 py-0.5 text-xs font-normal bg-slate-100 text-slate-600 rounded-md border border-slate-200">우선순위 하</span>;
    }
  };

  const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
      case 'DM발송':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case '반송처리':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case '만료안내':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case '입금확인':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <ListTodo className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800">
              이번 달 처리할 일
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              실시간 동기화
            </span>
          </div>
          <p className="text-xs text-slate-500">
            신문과방송 정기구독 DM 관리 관련 이번 달 미션 및 업무 현황
          </p>
        </div>

        {/* Action button */}
        {!isReadOnly ? (
          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>새 할 일 등록</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs rounded-lg font-bold">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>조회 전용</span>
          </div>
        )}
      </div>

      {/* Monthly Progress Bar */}
      <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            이번 달 업무 달성률: <strong className="text-emerald-300 font-bold">{progressPercent}%</strong> ({completedCount}개 완료 / 총 {totalCount}개)
          </span>
        </div>
        <div className="w-full sm:w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
          <div
            className="bg-indigo-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Category & Status Filter Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs font-medium">
          {(['전체', '진행중', '완료'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Bar */}
      {!isReadOnly && (
        <form
          onSubmit={handleQuickAdd}
          className="p-3 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row items-center gap-2"
        >
          <input
            type="text"
            placeholder="빠른 할 일 추가... (예: 정기구독 우편 영수증 정산)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value as TaskCategory)}
              className="px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="DM발송">DM발송</option>
              <option value="반송처리">반송처리</option>
              <option value="만료안내">만료안내</option>
              <option value="입금확인">입금확인</option>
              <option value="기타">기타</option>
            </select>
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as PriorityLevel)}
              className="px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="상">우선순위 상</option>
              <option value="중">우선순위 중</option>
              <option value="하">우선순위 하</option>
            </select>
            <button
              type="submit"
              disabled={isAddingQuick || !quickTitle.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>
        </form>
      )}

      {/* Task List items */}
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {filteredTodos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">
              조건에 해당하는 할 일이 없습니다.
            </p>
            <p className="text-xs text-slate-400">
              상단의 [새 할 일 등록] 또는 빠른 추가 창에서 새 항목을 만들어보세요.
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 group ${
                todo.completed ? 'bg-slate-50/40' : ''
              }`}
            >
              {/* Checkbox and Info */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <button
                  onClick={!isReadOnly ? () => handleToggleComplete(todo) : undefined}
                  disabled={isReadOnly}
                  className={`mt-0.5 shrink-0 ${
                    isReadOnly
                      ? 'cursor-default'
                      : 'text-slate-400 hover:text-blue-600 transition-colors cursor-pointer'
                  }`}
                  title={isReadOnly ? '조회 전용' : todo.completed ? '미완료로 변경' : '완료로 변경'}
                >
                  {todo.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 hover:text-blue-500" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getCategoryColor(
                        todo.category
                      )}`}
                    >
                      {todo.category}
                    </span>
                    {getPriorityBadge(todo.priority)}

                    {todo.dueDate && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>마감: {todo.dueDate}</span>
                      </span>
                    )}

                    {todo.assignedTo && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{todo.assignedTo}</span>
                      </span>
                    )}
                  </div>

                  <p
                    onClick={!isReadOnly ? () => handleToggleComplete(todo) : undefined}
                    className={`text-sm font-medium leading-snug ${
                      isReadOnly ? 'cursor-default' : 'cursor-pointer hover:text-blue-600'
                    } ${
                      todo.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {todo.title}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!isReadOnly && (
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditTask(todo)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors text-xs cursor-pointer"
                    title="수정"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setTodoToDelete(todo)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>* 항목 체크시 Firebase Firestore에 즉시 상태 업데이트됩니다.</span>
        <span>총 {filteredTodos.length}개 항목 표시중</span>
      </div>

      {/* Delete Confirmation Modal */}
      {todoToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              할 일 항목 삭제
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>"{todoToDelete.title}"</strong> 항목을 삭제하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTodoToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
