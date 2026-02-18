
export enum AuditStatus {
  WAITING = 'Aguardando',
  CHATTING = 'Em Conversa',
  FINISHED = 'Finalizado',
  FAILED = 'Falha'
}

export interface AuditTarget {
  id: string;
  name: string;
  status: AuditStatus;
  lastInteraction: string;
  phone: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface MetricData {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
}
