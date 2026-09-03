import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, User, ListTodo } from 'lucide-react';
import { TodoTask, PriorityLevel, TaskCategory } from '../types';
import { addTodo, updateTodo } from '../services/firebaseService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TodoTask | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('DM발송');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('중');
  const [assignedTo, setAssignedTo] = useState('김철수 대리');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setCategory(taskToEdit.category);
      setDueDate(taskToEdit.dueDate || '');
      setPriority(taskToEdit.priority || '중');
      setAssignedTo(taskToEdit.assignedTo || '담당자');
    } else {
      setTitle('');
      setCategory('DM발송');
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      setPriority('중');
      setAssignedTo('김철수 대리');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (taskToEdit && taskToEdit.id) {
        await updateTodo(taskToEdit.id, {
          title: title.trim(),
          category,
          dueDate: dueDate || today,
          priority,
          assignedTo
        });
      } else {
        await addTodo({
          title: title.trim(),
          category,
          dueDate: dueDate || today,
          priority,
          completed: false,
          assignedTo,
          createdAt: today
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-900">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {taskToEdit ? '할 일 수정' : '신규 이번 달 할 일 등록'}
              </h3>
              <p className="text-xs text-slate-400">
                &lt;신문과방송&gt; DM 관리 업무 항목 작성
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              업무 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 정기구독자 우체국 발송 라벨 검수"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DM발송">DM발송</option>
                <option value="반송처리">반송처리</option>
                <option value="만료안내">만료안내</option>
                <option value="입금확인">입금확인</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="상">상 (긴급/필수)</option>
                <option value="중">중 (일반)</option>
                <option value="하">하 (여유)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                마감일자
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                담당자
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="담당자 이름"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{taskToEdit ? '수정사항 저장' : '새 할 일 등록'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
