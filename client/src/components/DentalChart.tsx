import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToothState {
  number: string;
  condition: 'healthy' | 'decayed' | 'missing' | 'filled' | 'crowned';
}

interface DentalChartProps {
  selectedTeeth: ToothState[];
  onToothClick: (tooth: ToothState) => void;
  mode: 'select' | 'mark';
  currentCondition: ToothState['condition'];
}

export function DentalChart({ selectedTeeth, onToothClick, mode, currentCondition }: DentalChartProps) {
  const upperTeeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
  const lowerTeeth = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

  const getToothState = (toothNumber: string): ToothState => {
    return selectedTeeth.find(t => t.number === toothNumber) || { number: toothNumber, condition: 'healthy' };
  };

  const getToothClassName = (tooth: ToothState) => {
    const baseClasses = "w-8 h-8 border-2 rounded cursor-pointer flex items-center justify-center text-xs font-medium dental-chart-tooth transition-all duration-200";
    
    switch (tooth.condition) {
      case 'decayed':
        return cn(baseClasses, "bg-red-200 border-red-400 text-red-800");
      case 'missing':
        return cn(baseClasses, "bg-gray-300 border-gray-500 text-gray-700");
      case 'filled':
        return cn(baseClasses, "bg-blue-200 border-blue-400 text-blue-800");
      case 'crowned':
        return cn(baseClasses, "bg-yellow-200 border-yellow-400 text-yellow-800");
      default:
        return cn(baseClasses, "bg-white border-gray-300 text-gray-700 hover:border-blue-500");
    }
  };

  const handleToothClick = (toothNumber: string) => {
    const currentTooth = getToothState(toothNumber);
    
    if (mode === 'mark') {
      onToothClick({ number: toothNumber, condition: currentCondition });
    } else {
      onToothClick(currentTooth);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="text-center mb-4">
        <h5 className="text-sm font-medium text-gray-600">Upper Jaw (Maxilla)</h5>
      </div>
      
      <div className="grid grid-cols-8 gap-2 mb-6 justify-center">
        {upperTeeth.slice(0, 8).map((toothNumber) => {
          const tooth = getToothState(toothNumber);
          return (
            <div
              key={toothNumber}
              className={getToothClassName(tooth)}
              onClick={() => handleToothClick(toothNumber)}
            >
              {toothNumber}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-8 gap-2 mb-6 justify-center">
        {upperTeeth.slice(8).map((toothNumber) => {
          const tooth = getToothState(toothNumber);
          return (
            <div
              key={toothNumber}
              className={getToothClassName(tooth)}
              onClick={() => handleToothClick(toothNumber)}
            >
              {toothNumber}
            </div>
          );
        })}
      </div>

      <div className="text-center mb-4">
        <h5 className="text-sm font-medium text-gray-600">Lower Jaw (Mandible)</h5>
      </div>

      <div className="grid grid-cols-8 gap-2 mb-6 justify-center">
        {lowerTeeth.slice(0, 8).map((toothNumber) => {
          const tooth = getToothState(toothNumber);
          return (
            <div
              key={toothNumber}
              className={getToothClassName(tooth)}
              onClick={() => handleToothClick(toothNumber)}
            >
              {toothNumber}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-8 gap-2 mb-6 justify-center">
        {lowerTeeth.slice(8).map((toothNumber) => {
          const tooth = getToothState(toothNumber);
          return (
            <div
              key={toothNumber}
              className={getToothClassName(tooth)}
              onClick={() => handleToothClick(toothNumber)}
            >
              {toothNumber}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-200 border border-red-400 rounded mr-2"></div>
          <span>Decayed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-300 border border-gray-500 rounded mr-2"></div>
          <span>Missing</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded mr-2"></div>
          <span>Filled</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded mr-2"></div>
          <span>Crown</span>
        </div>
      </div>
    </div>
  );
}
