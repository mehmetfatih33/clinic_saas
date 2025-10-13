"use client";
import * as Toast from "@radix-ui/react-toast";
import { createContext, useContext, useState } from "react";

interface ToastData {
  type: "success" | "error" | "info";
  message: string;
}

const ToastContext = createContext({ show: (msg: string, type?: "success" | "error" | "info") => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastData>({ message: "", type: "info" });

  const show = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message: msg, type });
    setOpen(true);
  };

  const colorMap = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-sky-600",
  };

  return (
    <ToastContext.Provider value={{ show }}>
      <Toast.Provider swipeDirection="right">
        {children}
        <Toast.Root
          className={`fixed bottom-4 right-4 rounded-lg text-white px-4 py-3 shadow-lg ${colorMap[toast.type]}`}
          open={open}
          onOpenChange={setOpen}
        >
          <Toast.Title className="font-semibold">{toast.message}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}