import { ElementType } from 'react';

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, actionLabel }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-mint-50 to-sun-50 ring-1 ring-inset ring-blue-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
      <Icon size={26} className="text-blue-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
    <p className="text-sm text-gray-500 max-w-xs mb-6 leading-relaxed">{description}</p>
    {action && (
      <button
        onClick={action}
        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
