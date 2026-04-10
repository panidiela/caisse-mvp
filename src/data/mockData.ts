// src/data/mockData.ts

import { User, Product, Table } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Aminata', role: 'server' },
  { id: 'u2', name: 'Christelle', role: 'server' },
  { id: 'u3', name: 'Brigitte', role: 'cashier' },
  { id: 'u4', name: 'Patron', role: 'manager' },
];

export const MOCK_TABLES: Table[] = [
  { id: 't1', name: 'Table 1', status: 'free' },
  { id: 't2', name: 'Table 2', status: 'free' },
  { id: 't3', name: 'Table 3', status: 'free' },
  { id: 't4', name: 'Table 4', status: 'free' },
  { id: 't5', name: 'Table 5', status: 'free' },
  { id: 't6', name: 'Table 6', status: 'free' },
  { id: 'tc', name: 'Comptoir', status: 'free' },
  { id: 'tt', name: 'Terrasse', status: 'free' },
];

export const MOCK_PRODUCTS: Product[] = [
  // Boissons avec code-barres
  { id: 'p1', name: 'Castel Bière 65cl', price: 700, category: 'Bières', barcode: '6001019000009', isBarcodeBased: true, isActive: true },
  { id: 'p2', name: '33 Export 65cl', price: 700, category: 'Bières', barcode: '6001019000016', isBarcodeBased: true, isActive: true },
  { id: 'p3', name: 'Guinness 65cl', price: 800, category: 'Bières', barcode: '5011013100004', isBarcodeBased: true, isActive: true },
  { id: 'p4', name: 'Coca-Cola 50cl', price: 500, category: 'Sodas', barcode: '5449000000996', isBarcodeBased: true, isActive: true },
  { id: 'p5', name: 'Fanta Orange 50cl', price: 500, category: 'Sodas', barcode: '5449000131546', isBarcodeBased: true, isActive: true },
  { id: 'p6', name: 'Sprite 50cl', price: 500, category: 'Sodas', barcode: '5449000000439', isBarcodeBased: true, isActive: true },
  { id: 'p7', name: 'Eau minérale 1.5L', price: 400, category: 'Eaux', barcode: '3274080005003', isBarcodeBased: true, isActive: true },
  { id: 'p8', name: 'Maltina 65cl', price: 600, category: 'Sans alcool', barcode: '6001019005004', isBarcodeBased: true, isActive: true },

  // Boissons sans code-barres
  { id: 'p9', name: 'Café noir', price: 200, category: 'Chauds', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p10', name: 'Café au lait', price: 300, category: 'Chauds', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p11', name: 'Thé', price: 200, category: 'Chauds', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p12', name: 'Nescafé', price: 300, category: 'Chauds', barcode: null, isBarcodeBased: false, isActive: true },

  // Plats
  { id: 'p13', name: 'Omelette œufs', price: 500, category: 'Plats', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p14', name: 'Sandwich jambon', price: 700, category: 'Plats', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p15', name: 'Haricots sautés', price: 500, category: 'Plats', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p16', name: 'Poulet braisé', price: 2000, category: 'Plats', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p17', name: 'Poisson braisé', price: 2500, category: 'Plats', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p18', name: 'Alloco', price: 300, category: 'Accompagnements', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p19', name: 'Beignets (5 pièces)', price: 250, category: 'Accompagnements', barcode: null, isBarcodeBased: false, isActive: true },
  { id: 'p20', name: 'Pain grillé', price: 200, category: 'Accompagnements', barcode: null, isBarcodeBased: false, isActive: true },
];
