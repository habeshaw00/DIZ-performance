
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { TodoItem } from '../types';

const StrategicLogView: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    setTodos(db.getTodosForStaff(user!.id));
  }, [user]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    db.addTodo(user!.id, newTodo);
    setTodos(db.getTodosForStaff(user!.id));
    setNewTodo('');
  };

  const handleToggleTodo = (id: string) => {
    db.toggleTodo(id);
    setTodos(db.getTodosForStaff(user!.id));
  };

  const handleDeleteTodo = (id: string) => {
    db.deleteTodo(id);
    setTodos(db.getTodosForStaff(user!.id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-up">
      <div className="flex items-center gap-6 p-8 glass rounded-[40px] border border-white/5">
        <div className="w-16 h-16 bg-emerald-600/20 rounded-3xl flex items-center justify-center text-3xl shadow-lg border border-emerald-500/30">📒</div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">Strategic Log</h2>
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Recall Vault for Operational Continuity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <div className="glass p-10 rounded-[40px] border border-white/10 shadow-2xl bg-[#000d1a]/40 sticky top-8">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <span className="text-emerald-400">⚡</span> New Memo
            </h3>
            <div className="bg-emerald-900/20 border border-emerald-500/20 p-5 rounded-2xl mb-8">
              <p className="text-[11px] text-emerald-100 font-medium leading-relaxed italic">
                💡 <span className="font-black text-white uppercase tracking-tighter">Bridge GAP:</span> These notes bridge the gap between sessions. Record everything that ensures tomorrow's targets are hit.
              </p>
            </div>
            <form onSubmit={handleAddTodo}>
              <input
                type="text"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 text-sm outline-none focus:border-emerald-500 text-emerald-50 transition-all shadow-inner mb-4"
                placeholder="Strategic reminder..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-3xl font-black transition-all text-xs shadow-xl active:scale-95 uppercase tracking-widest">
                Commit to Vault
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Active Memos</h4>
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>
          
          <div className="space-y-4">
            {todos.length === 0 ? (
              <div className="py-24 text-center glass rounded-[40px] border border-dashed border-white/10">
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs italic">No active strategic memos found.</p>
              </div>
            ) : (
              todos.sort((a,b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1).map(todo => (
                <div key={todo.id} className="p-6 bg-[#001226] rounded-3xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/40 transition-all shadow-xl">
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <input 
                      type="checkbox" 
                      checked={todo.completed} 
                      onChange={() => handleToggleTodo(todo.id)} 
                      className="w-7 h-7 accent-emerald-500 cursor-pointer rounded-xl" 
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${todo.completed ? 'line-through text-gray-600' : 'text-emerald-50'}`}>
                        {todo.task}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">
                        Recorded {new Date(todo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteTodo(todo.id)} 
                    className="text-emerald-900 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-white/5 rounded-2xl"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicLogView;
