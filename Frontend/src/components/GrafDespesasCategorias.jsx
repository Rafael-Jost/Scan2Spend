import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import { TbChartBarPopular } from 'react-icons/tb';


const fills = {
    'Alimentação': '#f89c71',
    'Bebidas': '#60a5fa',
    'Higiene Pessoal': '#a78bfa',
    'Lanches & Conveniência': '#fbbf24',
    'Limpeza': '#34d3ab',
    'Outros': '#94a3b8',
    'Pets': '#b39c78',
    'Utilidades': '#fa9be2'
  };

  const getFill = (dados) => {
      return( dados.map(dado => ({
      ...dado,
      fill: fills[dado.categoria] || '#9CA3AF'
    })));
  };

export default function GrafDespesasCategorias({ dados, buscarDespesasCategorias, setTipoGrafDespesasCategorias }) {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsMobile(entry.contentRect.width < 500);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  dados = getFill(dados);

  return (
      <>
      <div ref={containerRef} style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Despesas por Categoria</h2>
          <button onClick={() => setTipoGrafDespesasCategorias('periodo')} style={{ background: 'linear-gradient(135deg, #4ab0d8, #66d4ca)', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TbChartBarPopular size={22} />
          </button>
        </div>
        <ResponsiveContainer width="100%" aspect={isMobile ? 1 : 1.5}>
          <PieChart>
            <Pie data={dados} dataKey="despesa" nameKey="categoria" outerRadius="80%" innerRadius="60%" isAnimationActive={false}>
              <Label position="center" fill="#ffffff" fontSize={14}>Despesas por Categoria</Label>
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            {!isMobile && <Legend layout="vertical" verticalAlign="middle" align="right" />}
            <RechartsDevtools />
          </PieChart>
        </ResponsiveContainer>
        {isMobile && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: '8px' }}>
            {dados.map((entry) => (
              <div key={entry.categoria} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: entry.fill, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#e5e7eb' }}>{entry.categoria}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
  );
}