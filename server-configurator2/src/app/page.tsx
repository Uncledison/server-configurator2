"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AlertTriangle, Server, Cpu, HardDrive, Zap, Monitor } from 'lucide-react';

const ServerConfigurator = () => {
  // 서버 스펙 데이터를 useMemo로 래핑하고 타입 정의 개선
  const serverSpecs = useMemo(() => ({
    'Dell PowerEdge R750': {
      maxCPU: 2,
      maxMemory: 128, // GB
      maxGPU: 3,
      compatibleCPUs: ['Intel Xeon Silver 4314', 'Intel Xeon Gold 5318Y', 'Intel Xeon Platinum 8380'],
      compatibleMemory: ['Samsung DDR4-3200 32GB', 'SK Hynix DDR4-2933 16GB', 'Micron DDR4-3200 64GB'],
      compatibleGPUs: ['NVIDIA H100 80GB', 'NVIDIA A100 40GB', 'NVIDIA RTX 4090 24GB'],
      maxPowerConsumption: 1400 // watts
    },
    'HPE ProLiant DL380 Gen10': {
      maxCPU: 2,
      maxMemory: 256,
      maxGPU: 2,
      compatibleCPUs: ['Intel Xeon Gold 6248R', 'Intel Xeon Silver 4210R', 'Intel Xeon Platinum 8270'],
      compatibleMemory: ['Samsung DDR4-2933 32GB', 'SK Hynix DDR4-3200 64GB', 'Corsair DDR4-2666 16GB'],
      compatibleGPUs: ['NVIDIA H100 80GB', 'NVIDIA A100 80GB', 'NVIDIA Tesla V100 32GB'],
      maxPowerConsumption: 1600
    }
  }), []);

  // 타입 정의 추가
  type ServerSpecKey = keyof typeof serverSpecs;
  type ServerSpec = typeof serverSpecs[ServerSpecKey];

  // 컴포넌트 스펙 데이터도 useMemo로 래핑
  const componentSpecs = useMemo(() => ({
    'Intel Xeon Silver 4314': { power: 135, cores: 16 },
    'Intel Xeon Gold 5318Y': { power: 165, cores: 24 },
    'Intel Xeon Platinum 8380': { power: 270, cores: 40 },
    'Intel Xeon Gold 6248R': { power: 205, cores: 24 },
    'Intel Xeon Silver 4210R': { power: 100, cores: 10 },
    'Intel Xeon Platinum 8270': { power: 205, cores: 26 },
    'Samsung DDR4-3200 32GB': { capacity: 32, power: 5 },
    'SK Hynix DDR4-2933 16GB': { capacity: 16, power: 4 },
    'Micron DDR4-3200 64GB': { capacity: 64, power: 6 },
    'Samsung DDR4-2933 32GB': { capacity: 32, power: 5 },
    'SK Hynix DDR4-3200 64GB': { capacity: 64, power: 6 },
    'Corsair DDR4-2666 16GB': { capacity: 16, power: 4 },
    'NVIDIA H100 80GB': { memory: 80, power: 700 },
    'NVIDIA A100 40GB': { memory: 40, power: 400 },
    'NVIDIA A100 80GB': { memory: 80, power: 400 },
    'NVIDIA RTX 4090 24GB': { memory: 24, power: 450 },
    'NVIDIA Tesla V100 32GB': { memory: 32, power: 300 }
  }), []);

  type ComponentSpecKey = keyof typeof componentSpecs;

  const [selectedServer, setSelectedServer] = useState<string>('');
  const [configuredComponents, setConfiguredComponents] = useState({
    cpu: [] as string[],
    memory: [] as string[],
    gpu: [] as string[]
  });
  const [availableComponents, setAvailableComponents] = useState({
    cpu: [] as string[],
    memory: [] as string[],
    gpu: [] as string[]
  });
  const [draggedItem, setDraggedItem] = useState<{component: string, type: string} | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);

  // 타입 가드 함수 추가
  const isValidServerKey = (key: string): key is ServerSpecKey => {
    return key in serverSpecs;
  };

  const isValidComponentKey = (key: string): key is ComponentSpecKey => {
    return key in componentSpecs;
  };

  // 서버 선택 시 호환 가능한 컴포넌트 업데이트 - 타입 안전성 개선
  useEffect(() => {
    if (selectedServer && isValidServerKey(selectedServer)) {
      const spec = serverSpecs[selectedServer];
      setAvailableComponents({
        cpu: spec.compatibleCPUs,
        memory: spec.compatibleMemory,
        gpu: spec.compatibleGPUs
      });
      setShowCanvas(true);
      setConfiguredComponents({ cpu: [], memory: [], gpu: [] });
      setErrors([]);
    } else {
      setShowCanvas(false);
      setAvailableComponents({ cpu: [], memory: [], gpu: [] });
      setConfiguredComponents({ cpu: [], memory: [], gpu: [] });
      setErrors([]);
    }
  }, [selectedServer]);

  // 드롭 전 유효성 사전 검사
  const canAddComponent = (component: string, type: string) => {
    if (!selectedServer || !isValidServerKey(selectedServer)) {
      return { valid: false, error: '서버를 선택해주세요.' };
    }
    
    const spec = serverSpecs[selectedServer];
    const newConfig = {
      ...configuredComponents,
      [type]: [...configuredComponents[type as keyof typeof configuredComponents], component]
    };
    
    // 개수 제한 검사
    if (type === 'cpu' && newConfig.cpu.length > spec.maxCPU) {
      return { valid: false, error: `CPU는 최대 ${spec.maxCPU}개까지만 설치 가능합니다.` };
    }
    
    if (type === 'gpu' && newConfig.gpu.length > spec.maxGPU) {
      return { valid: false, error: `GPU는 최대 ${spec.maxGPU}개까지만 설치 가능합니다.` };
    }
    
    // 메모리 용량 제한 검사
    const totalMemory = newConfig.memory.reduce((sum, mem) => {
      if (isValidComponentKey(mem)) {
        return sum + componentSpecs[mem].capacity;
      }
      return sum;
    }, 0);
    if (totalMemory > spec.maxMemory) {
      return { valid: false, error: `메모리는 최대 ${spec.maxMemory}GB까지만 설치 가능합니다.` };
    }
    
    // 전력 소비량 제한 검사
    const totalPower = [...newConfig.cpu, ...newConfig.memory, ...newConfig.gpu]
      .reduce((sum, comp) => {
        if (isValidComponentKey(comp)) {
          return sum + componentSpecs[comp].power;
        }
        return sum;
      }, 0);
    if (totalPower > spec.maxPowerConsumption) {
      return { valid: false, error: `전력 소비량이 최대 허용량 ${spec.maxPowerConsumption}W를 초과합니다.` };
    }
    
    return { valid: true };
  };

  // 유효성 검사 (기존 구성 재검사용)
  const validateConfiguration = (config = configuredComponents) => {
    if (!selectedServer || !isValidServerKey(selectedServer)) return false;
    
    const spec = serverSpecs[selectedServer];
    const newErrors: string[] = [];
    
    if (config.cpu.length > spec.maxCPU) {
      newErrors.push(`CPU는 최대 ${spec.maxCPU}개까지만 설치 가능합니다.`);
    }
    
    if (config.gpu.length > spec.maxGPU) {
      newErrors.push(`GPU는 최대 ${spec.maxGPU}개까지만 설치 가능합니다.`);
    }
    
    const totalMemory = config.memory.reduce((sum, mem) => {
      if (isValidComponentKey(mem)) {
        return sum + componentSpecs[mem].capacity;
      }
      return sum;
    }, 0);
    if (totalMemory > spec.maxMemory) {
      newErrors.push(`메모리는 최대 ${spec.maxMemory}GB까지만 설치 가능합니다.`);
    }
    
    const totalPower = [...config.cpu, ...config.memory, ...config.gpu]
      .reduce((sum, comp) => {
        if (isValidComponentKey(comp)) {
          return sum + componentSpecs[comp].power;
        }
        return sum;
      }, 0);
    if (totalPower > spec.maxPowerConsumption) {
      newErrors.push(`전력 소비량이 최대 허용량 ${spec.maxPowerConsumption}W를 초과합니다.`);
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent, component: string, type: string) => {
    setDraggedItem({ component, type });
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 캔버스에 드롭
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    // 드롭 전 유효성 검사
    const validation = canAddComponent(draggedItem.component, draggedItem.type);
    
    if (!validation.valid) {
      // 드롭 차단하고 에러 메시지만 표시
      setErrors([validation.error]);
      setDraggedItem(null);
      return;
    }
    
    // 유효한 경우에만 추가
    const newConfig = {
      ...configuredComponents,
      [draggedItem.type]: [...configuredComponents[draggedItem.type as keyof typeof configuredComponents], draggedItem.component]
    };
    
    setConfiguredComponents(newConfig);
    setErrors([]); // 성공적으로 추가되면 에러 메시지 지우기
    setDraggedItem(null);
  };

  // 컴포넌트 제거
  const removeComponent = (type: keyof typeof configuredComponents, index: number) => {
    const newConfig = {
      ...configuredComponents,
      [type]: configuredComponents[type].filter((_, i) => i !== index)
    };
    setConfiguredComponents(newConfig);
    validateConfiguration(newConfig);
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'cpu': return <Cpu className="w-6 h-6" />;
      case 'memory': return <HardDrive className="w-6 h-6" />;
      case 'gpu': return <Monitor className="w-6 h-6" />;
      default: return null;
    }
  };

  const calculateTotals = () => {
    const allComponents = [...configuredComponents.cpu, ...configuredComponents.memory, ...configuredComponents.gpu];
    const totalPower = allComponents.reduce((sum, comp) => {
      if (isValidComponentKey(comp)) {
        return sum + componentSpecs[comp].power;
      }
      return sum;
    }, 0);
    const totalMemory = configuredComponents.memory.reduce((sum, mem) => {
      if (isValidComponentKey(mem)) {
        return sum + componentSpecs[mem].capacity;
      }
      return sum;
    }, 0);
    return { totalPower, totalMemory };
  };

  const { totalPower, totalMemory } = calculateTotals();

  // 현재 서버 스펙 가져오기 (타입 안전)
  const getCurrentServerSpec = (): ServerSpec | null => {
    if (!selectedServer || !isValidServerKey(selectedServer)) {
      return null;
    }
    return serverSpecs[selectedServer];
  };

  const currentServerSpec = getCurrentServerSpec();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          <Server className="inline-block mr-3 mb-1" />
          서버 구성 시스템
        </h1>
        
        {/* 서버 선택 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">서버 모델 선택</h2>
          <select 
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-purple-400 focus:outline-none"
          >
            <option value="">서버를 선택하세요</option>
            {Object.keys(serverSpecs).map(server => (
              <option key={server} value={server} className="text-black">{server}</option>
            ))}
          </select>
        </div>

        {showCanvas && currentServerSpec && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 컴포넌트 팔레트 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">사용 가능한 컴포넌트</h3>
              
              {(['cpu', 'memory', 'gpu'] as const).map(type => (
                <div key={type} className="mb-6">
                  <h4 className="text-md font-medium text-white/80 mb-3 capitalize flex items-center">
                    {getComponentIcon(type)}
                    <span className="ml-2">{type.toUpperCase()}</span>
                  </h4>
                  <div className="space-y-2">
                    {availableComponents[type].map((component, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, component, type)}
                        className="p-3 bg-white/20 rounded-lg cursor-grab hover:bg-white/30 transition-all border border-white/10 text-white text-sm active:cursor-grabbing"
                      >
                        {component}
                        <div className="text-xs text-white/70 mt-1">
                          {type === 'memory' && isValidComponentKey(component) && `${componentSpecs[component].capacity}GB`}
                          {type === 'gpu' && isValidComponentKey(component) && `${componentSpecs[component].memory}GB VRAM`}
                          {type === 'cpu' && isValidComponentKey(component) && `${componentSpecs[component].cores} Cores`}
                          {isValidComponentKey(component) && <span className="ml-2">{componentSpecs[component].power}W</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 구성 캔버스 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">서버 구성</h3>
              <div 
                className="min-h-96 border-2 border-dashed border-white/30 rounded-lg p-4 bg-white/5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
              >
                <p className="text-white/60 text-center mb-4">컴포넌트를 여기에 드래그하세요</p>
                
                {(['cpu', 'memory', 'gpu'] as const).map(type => (
                  <div key={type} className="mb-6">
                    <h4 className="text-white/80 font-medium mb-2 flex items-center">
                      {getComponentIcon(type)}
                      <span className="ml-2 capitalize">{type}</span>
                      <span className="ml-2 text-sm">
                        ({configuredComponents[type].length}/{
                          type === 'cpu' ? currentServerSpec.maxCPU :
                          type === 'gpu' ? currentServerSpec.maxGPU : '∞'
                        })
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {configuredComponents[type].map((component, idx) => (
                        <div key={idx} className="p-2 bg-purple-600/30 rounded text-white text-sm flex justify-between items-center">
                          <span>{component}</span>
                          <button 
                            onClick={() => removeComponent(type, idx)}
                            className="text-red-300 hover:text-red-100 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 상태 및 정보 */}
            <div className="space-y-6">
              {/* 에러 메시지 */}
              {errors.length > 0 && (
                <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30">
                  <div className="flex items-center text-red-300 mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">구성 오류</span>
                  </div>
                  {errors.map((error, idx) => (
                    <p key={idx} className="text-red-200 text-sm">{error}</p>
                  ))}
                </div>
              )}

              {/* 시스템 정보 */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <h4 className="text-white font-semibold mb-3">시스템 정보</h4>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>총 메모리:</span>
                    <span>{totalMemory}GB / {currentServerSpec.maxMemory}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 전력:</span>
                    <span className={totalPower > currentServerSpec.maxPowerConsumption ? 'text-red-300' : ''}>
                      {totalPower}W / {currentServerSpec.maxPowerConsumption}W
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU 개수:</span>
                    <span>{configuredComponents.cpu.length} / {currentServerSpec.maxCPU}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GPU 개수:</span>
                    <span>{configuredComponents.gpu.length} / {currentServerSpec.maxGPU}</span>
                  </div>
                </div>
              </div>

              {/* 구성 요약 */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <h4 className="text-white font-semibold mb-3">구성 요약</h4>
                <div className="text-sm text-white/80 space-y-1">
                  <div>CPU: {configuredComponents.cpu.length}개</div>
                  <div>메모리: {configuredComponents.memory.length}개 ({totalMemory}GB)</div>
                  <div>GPU: {configuredComponents.gpu.length}개</div>
                  <div className="pt-2 border-t border-white/20">
                    <div className={`font-medium ${errors.length === 0 ? 'text-green-300' : 'text-yellow-300'}`}>
                      상태: {errors.length === 0 ? '구성 완료' : '드래그 차단됨'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerConfigurator;
