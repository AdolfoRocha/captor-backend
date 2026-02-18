
import React from 'react';
import {
  Users,
  CheckCircle,
  Zap,
  Coins,
  Search,
  MessageSquare,
  Terminal,
  Settings,
  LayoutDashboard,
  Smartphone,
  MapPin
} from 'lucide-react';
import { AuditStatus, AuditTarget, LogEntry, MetricData } from './types';

export const INITIAL_METRICS: MetricData[] = [
  { label: 'Profissionais na Fila', value: 150, trend: '+12%', icon: 'Users' },
  { label: 'Auditados Hoje', value: 42, trend: '+5%', icon: 'CheckCircle' },
  { label: 'Taxa de Resposta', value: '68%', trend: '-2%', icon: 'Zap' },
  { label: 'Saldo de Créditos', value: '1.250', trend: 'Assinante Pro', icon: 'Coins' }
];

export const MOCK_TARGETS: AuditTarget[] = [
  { id: '1', name: 'Dr. Carlos Silva', status: AuditStatus.CHATTING, lastInteraction: 'Há 2 min', phone: '+55 11 98877-6655' },
  { id: '2', name: 'Dra. Ana Paula', status: AuditStatus.FINISHED, lastInteraction: 'Há 15 min', phone: '+55 11 97766-5544' },
  { id: '3', name: 'Dr. Roberto Santos', status: AuditStatus.WAITING, lastInteraction: '-', phone: '+55 21 96655-4433' },
  { id: '4', name: 'Clínica OdontoPlus', status: AuditStatus.FAILED, lastInteraction: 'Ontem', phone: '+55 31 95544-3322' },
  { id: '5', name: 'Dr. Marcelo Mendes', status: AuditStatus.FINISHED, lastInteraction: 'Hoje 09:42', phone: '+55 11 94433-2211' }
];

export const MOCK_LOGS: LogEntry[] = [
  { id: 'L1', timestamp: '14:20:11', message: 'Sistema Captor Inicializado.', type: 'info' },
  { id: 'L2', timestamp: '14:20:15', message: 'Conectado ao driver WhatsApp Web (Local).', type: 'success' },
  { id: 'L3', timestamp: '14:21:02', message: 'Scraping target: Dr. Carlos Silva...', type: 'info' },
  { id: 'L4', timestamp: '14:21:45', message: 'Prompt enviado para OpenAI (GPT-4o).', type: 'info' },
  { id: 'L5', timestamp: '14:22:10', message: 'Mensagem enviada via WhatsApp para Dr. Carlos.', type: 'success' },
  { id: 'L6', timestamp: '14:24:33', message: 'Resposta recebida de Dr. Carlos.', type: 'info' },
];

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'mission', label: 'Nova Missão', icon: Search },
  { id: 'captacao', label: 'Captação (G. Maps)', icon: MapPin },
  { id: 'whatsapp', label: 'Conexão WhatsApp', icon: Smartphone },
  { id: 'logs', label: 'Logs em Tempo Real', icon: Terminal },
  { id: 'results', label: 'Resultados', icon: MessageSquare },
  { id: 'settings', label: 'Configurações', icon: Settings },
];
