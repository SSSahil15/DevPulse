import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, LineChart, Line, CartesianGrid } from 'recharts';

const waveData = [
  { name: 'Mon', risk: 4000, baseline: 2400 },
  { name: 'Tue', risk: 3000, baseline: 1398 },
  { name: 'Wed', risk: 2000, baseline: 9800 },
  { name: 'Thu', risk: 2780, baseline: 3908 },
  { name: 'Fri', risk: 1890, baseline: 4800 },
  { name: 'Sat', risk: 2390, baseline: 3800 },
  { name: 'Sun', risk: 3490, baseline: 4300 },
];

export const WaveChart = () => {
  const [data, setData] = React.useState(waveData);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        newData.push({
          name: 'live',
          risk: Math.max(1000, Math.min(5000, last.risk + (Math.random() * 1000 - 500))),
          baseline: Math.max(1000, Math.min(5000, last.baseline + (Math.random() * 1000 - 500))),
        });
        return newData;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Area type="monotone" dataKey="baseline" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBaseline)" animationDuration={1000} isAnimationActive={false} />
        <Area type="monotone" dataKey="risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" animationDuration={1000} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const barData = [
  { name: '10am', scans: 40 },
  { name: '11am', scans: 70 },
  { name: '12pm', scans: 45 },
  { name: '1pm', scans: 90 },
  { name: '2pm', scans: 65 },
  { name: '3pm', scans: 80 },
  { name: '4pm', scans: 30 },
  { name: '5pm', scans: 55 },
];

export const BarChart = () => {
  const [data, setData] = React.useState(barData);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        newData.push({
          name: 'live',
          scans: Math.max(20, Math.min(100, last.scans + (Math.random() * 40 - 20)))
        });
        return newData;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip 
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
        />
        <Bar dataKey="scans" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

const securityData = [
  { time: '00:00', issues: 12 },
  { time: '04:00', issues: 15 },
  { time: '08:00', issues: 8 },
  { time: '12:00', issues: 20 },
  { time: '16:00', issues: 5 },
  { time: '20:00', issues: 9 },
  { time: '24:00', issues: 2 },
];

export const SecurityLineChart = () => {
  const [data, setData] = React.useState(securityData);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        newData.push({
          time: 'live',
          issues: Math.max(2, Math.min(25, last.issues + Math.floor(Math.random() * 5 - 2)))
        });
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
        />
        <Line type="monotone" dataKey="issues" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff', stroke: '#f97316' }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const ActivityGrid = () => {
  const [offset, setOffset] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => setOffset(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-2 opacity-60">
      {[...Array(4)].map((_, row) => (
        <div key={row} className="flex gap-2 justify-between flex-1">
          {[...Array(14)].map((_, col) => {
            const isActive = (row * 14 + col + offset) % 3 === 0 || (row * 14 + col + offset) % 7 === 0;
            return (
              <div 
                key={col} 
                className={`flex-1 rounded-sm transition-all duration-500 ${isActive ? 'bg-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.5)] scale-110' : 'bg-white/5'}`} 
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
