"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MoreVertical, 
  Trash2, 
  User as UserIcon,
  Calendar as CalendarIcon,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import AddTaskModal from "@/components/ui/AddTaskModal";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function TasksPage() {
  return (
    <ToastProvider>
      <TasksContent />
    </ToastProvider>
  );
}

function TasksContent() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  // Update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Güncelleme hatası");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      show("Görev durumu güncellendi", "success");
    },
    onError: () => {
      show("Hata oluştu", "error");
    }
  });

  // Delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme hatası");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      show("Görev silindi", "success");
    },
    onError: () => {
      show("Silinirken hata oluştu", "error");
    }
  });

  const todoTasks = tasks.filter((t: any) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t: any) => t.status === "DONE");

  const handleStatusChange = (id: string, newStatus: string) => {
    updateTaskMutation.mutate({ id, status: newStatus });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "HIGH": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "LOW": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const TaskCard = ({ task }: { task: any }) => (
    <motion.div
      layoutId={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
          {task.priority === "HIGH" ? "YÜKSEK" : task.priority === "MEDIUM" ? "ORTA" : "DÜŞÜK"}
        </span>
        <button 
            onClick={(e) => {
                e.stopPropagation();
                if(confirm("Görevi silmek istiyor musunuz?")) deleteTaskMutation.mutate(task.id);
            }}
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
            <Trash2 size={14} />
        </button>
      </div>
      
      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">{task.title}</h3>
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
            {task.assignedTo && (
                <div className="flex items-center gap-1 text-xs text-gray-500" title={`Atanan: ${task.assignedTo.name}`}>
                    <UserIcon size={12} />
                    <span className="max-w-[80px] truncate">{task.assignedTo.name.split(' ')[0]}</span>
                </div>
            )}
            {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`} title={`Son Tarih: ${format(new Date(task.dueDate), 'dd MMM yyyy')}`}>
                    <CalendarIcon size={12} />
                    <span>{format(new Date(task.dueDate), 'dd MMM', { locale: tr })}</span>
                </div>
            )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2">
        {task.status !== "TODO" && (
            <button 
                onClick={() => handleStatusChange(task.id, "TODO")}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded"
            >
                Yapılacak
            </button>
        )}
        {task.status !== "IN_PROGRESS" && (
            <button 
                onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded"
            >
                Sürüyor
            </button>
        )}
        {task.status !== "DONE" && (
            <button 
                onClick={() => handleStatusChange(task.id, "DONE")}
                className="text-[10px] bg-green-50 hover:bg-green-100 text-green-600 px-2 py-1 rounded"
            >
                Tamamla
            </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Görevler</h1>
            <p className="text-muted-foreground">Ekip içi görev takibi ve yönetimi</p>
        </div>
        <AddTaskModal onAdded={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-[500px]">
        {/* TODO Column */}
        <div className="flex flex-col bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 h-full">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Circle size={16} className="text-gray-400" />
                <span className="font-semibold text-sm">Yapılacaklar</span>
                <span className="ml-auto bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                <AnimatePresence>
                    {todoTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
                </AnimatePresence>
                {todoTasks.length === 0 && <div className="text-center text-xs text-gray-400 py-8">Görev yok</div>}
            </div>
        </div>

        {/* IN PROGRESS Column */}
        <div className="flex flex-col bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-dashed border-blue-100 dark:border-blue-900/30 h-full">
            <div className="p-4 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">Sürüyor</span>
                <span className="ml-auto bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                <AnimatePresence>
                    {inProgressTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
                </AnimatePresence>
                {inProgressTasks.length === 0 && <div className="text-center text-xs text-gray-400 py-8">Görev yok</div>}
            </div>
        </div>

        {/* DONE Column */}
        <div className="flex flex-col bg-green-50/30 dark:bg-green-900/10 rounded-xl border border-dashed border-green-100 dark:border-green-900/30 h-full">
            <div className="p-4 border-b border-green-100 dark:border-green-900/30 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="font-semibold text-sm text-green-700 dark:text-green-400">Tamamlandı</span>
                <span className="ml-auto bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                <AnimatePresence>
                    {doneTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
                </AnimatePresence>
                {doneTasks.length === 0 && <div className="text-center text-xs text-gray-400 py-8">Tamamlanan yok</div>}
            </div>
        </div>
      </div>
    </div>
  );
}
