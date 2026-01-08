
import React from 'react';

export const SimpleBarChart = ({ data, dataKey, labelKey, height = 300, color = '#3b82f6', layout = 'horizontal' }: any) => {
  const maxVal = Math.max(...data.map((d: any) => d[dataKey] || 0), 1);

  if (layout === 'vertical') {
    return (
      <div className="w-full flex flex-col gap-3" style={{ height: 'auto', minHeight: height }}>
        {data.map((item: any, idx: number) => {
          const val = item[dataKey] || 0;
          const percent = (val / maxVal) * 100;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div className="w-32 truncate text-slate-500 dark:text-slate-400 text-right" title={item[labelKey]}>
                {item[labelKey]}
              </div>
              <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${percent}%`, backgroundColor: color }}
                >
                  {percent > 10 && <span className="text-[10px] text-white font-bold">{val}</span>}
                </div>
              </div>
              {percent <= 10 && <span className="text-slate-500 font-bold">{val}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full flex items-end justify-between gap-2" style={{ height }}>
      {data.map((item: any, idx: number) => {
        const val = item[dataKey] || 0;
        const percent = (val / maxVal) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
              {val}
            </div>
            <div 
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-80 relative group"
              style={{ height: `${percent}%`, backgroundColor: color, minHeight: '4px' }}
            >
                {/* Tooltip simples */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap">
                    {item[labelKey]}: {val}
                </div>
            </div>
            <div className="h-20 w-full flex items-start justify-center">
                 <span className="text-[10px] text-slate-400 -rotate-45 block w-24 text-right origin-top-right translate-y-2 truncate" title={item[labelKey]}>
                    {item[labelKey]}
                 </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
