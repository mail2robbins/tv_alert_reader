'use client';

interface OrderStatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
}

export default function OrderStatsCard({ title, value, subtitle, icon, color = 'blue' }: OrderStatsCardProps) {
  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600'
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon && (
              <div className={`w-8 h-8 ${iconColorClasses[color]} flex items-center justify-center`}>
                {icon}
              </div>
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
                {subtitle && (
                  <div className="ml-2 text-sm text-gray-500">
                    {subtitle}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
