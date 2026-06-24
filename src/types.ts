/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'operator';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  createdAt: string;
}

export interface ProgressCell {
  completed: boolean;
  status?: 'none' | 'executing' | 'completed';
  updatedBy: string;
  updatedAt: string;
}

export interface ProgressGroup {
  id: string; // "0", "100", "200", etc.
  cells: {
    [cellKey: string]: ProgressCell; // key: "${estaca}_${activityId}"
  };
}

export interface AuditLog {
  id: string;
  estaca: number;
  activityId: string;
  activityName: string;
  oldValue: boolean | string;
  newValue: boolean | string;
  updatedBy: string;
  timestamp: string;
}

export interface Activity {
  id: string;
  name: string;
  color: string; // hex color or tailwind class for grid cell background
}

export const ACTIVITIES: Activity[] = [
  { id: 'terraplenagem', name: 'Terraplenagem', color: '#D97706' }, // Orange-600
  { id: 'regularizacao_subleito', name: 'Regularização do Subleito', color: '#B45309' }, // Orange-700
  { id: 'sub_base', name: 'Sub Base', color: '#451A03' }, // Amber-950
  { id: 'base', name: 'Base', color: '#0F766E' }, // Teal-700
  { id: 'imprimacao', name: 'Imprimação', color: '#111827' }, // Gray-900
  { id: 'tsd_1_banho', name: 'TSD (1º Banho)', color: '#2563EB' }, // Blue-600
  { id: 'tsd_2_banho', name: 'TSD (2º Banho)', color: '#1D4ED8' }, // Blue-700
  { id: 'tsd_3_banho', name: '3º Banho', color: '#1E3A8A' } // Blue-900
];
