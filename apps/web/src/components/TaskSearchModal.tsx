'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@fambiz/types';

const CATEGORIES = ['掃除', '料理', '洗濯', 'その他'] as const;
type Category = (typeof CATEGORIES)[number];

// 分類チップの選択時カラー
const chipSelectedStyle: Record<Category, string> = {
  掃除: 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-300',
  料理: 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-300',
  洗濯: 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-2 ring-yellow-300',
  その他: 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-300',
};

// 結果テーブルの分類バッジカラー（TaskCard.tsx と同一）
const categoryBadgeStyle: Record<string, string> = {
  掃除: 'bg-blue-100 text-blue-700',
  料理: 'bg-red-100 text-red-700',
  洗濯: 'bg-yellow-100 text-yellow-700',
  その他: 'bg-green-100 text-green-700',
};

const statusConfig: Record<TaskStatus, { label: string; badgeClass: string }> = {
  pending: { label: '未対応', badgeClass: 'bg-gray-100 text-gray-600' },
  reported: { label: '対応済', badgeClass: 'bg-blue-100 text-blue-600' },
  completed: { label: '完了', badgeClass: 'bg-green-100 text-green-600' },
  cancelled: { label: 'キャンセル', badgeClass: 'bg-gray-100 text-gray-500' },
  expired: { label: '期限切れ', badgeClass: 'bg-red-100 text-red-600' },
};

interface TaskSearchModalProps {
  groupId: string;
  /** 担当者でタスクを絞り込む場合に指定するユーザーID */
  assigneeId?: string;
  /** タスクを選択したときに taskId と task_name を返すコールバック */
  onSelect: (taskId: string, taskName: string) => void;
  onClose: () => void;
}

// タスク検索モーダルコンポーネント（Client Component）
export function TaskSearchModal({ groupId, assigneeId, onSelect, onClose }: TaskSearchModalProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 検索実行：フィルタ条件を組み立てて API を呼び出す
  async function handleSearch() {
    setIsLoading(true);
    setSearched(true);
    setSelectedTaskId(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({ groupId });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      // 担当者フィルタが指定されている場合は絞り込む（目標登録時のタスク担当者整合性確保）
      if (assigneeId) params.set('assigneeId', assigneeId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/tasks?${params.toString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        setTasks((await res.json()) as Task[]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setKeyword('');
    setCategory('');
    setStatus('');
    setTasks([]);
    setSelectedTaskId(null);
    setSearched(false);
  }

  function handleConfirm() {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (task) {
      onSelect(task.id, task.task_name);
    }
  }

  return (
    // オーバーレイ背景
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // 背景クリックでモーダルを閉じる
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-bold text-gray-800">タスク検索</h3>
        </div>

        {/* 検索フォーム */}
        <div className="px-6 py-4 border-b space-y-4">
          {/* タスク名 キーワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="キーワードを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 分類 カラーチップ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分類</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(category === cat ? '' : cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    category === cat
                      ? chipSelectedStyle[cat]
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ステータス ラジオボタン */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
            <div className="flex gap-5">
              {[
                { value: '', label: '全て' },
                { value: 'completed', label: '完了' },
                { value: 'reported', label: '対応済' },
                { value: 'pending', label: '未対応' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="modal-status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 検索 / クリア ボタン */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? '検索中...' : '検索'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              クリア
            </button>
          </div>
        </div>

        {/* 検索結果テーブル */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="py-10 text-center text-gray-400 text-sm">検索中...</div>
          )}
          {!isLoading && searched && tasks.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">
              タスクが見つかりませんでした
            </div>
          )}
          {!isLoading && tasks.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b sticky top-0">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">タスク名</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">分類</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">ステータス</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">期日</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">報酬</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isSelected = task.id === selectedTaskId;
                  const statusInfo =
                    statusConfig[task.status] ?? {
                      label: task.status,
                      badgeClass: 'bg-gray-100 text-gray-600',
                    };
                  const catStyle = task.category
                    ? (categoryBadgeStyle[task.category] ?? 'bg-green-100 text-green-700')
                    : null;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`border-b cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">{task.task_name}</td>
                      <td className="px-4 py-2.5">
                        {catStyle ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${catStyle}`}
                          >
                            {task.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString('ja-JP', {
                              timeZone: 'Asia/Tokyo',
                            })
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700 font-medium">
                        {task.reward_amount.toLocaleString()}円
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* フッターボタン */}
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTaskId}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            選択
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
