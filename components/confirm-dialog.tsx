'use client';

import { TriangleAlert as AlertTriangle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDanger ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {isDanger ? (
                <Trash2 className="w-6 h-6 text-red-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-slate-900">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 mt-1">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel
            disabled={loading}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading ? 'Please wait...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
