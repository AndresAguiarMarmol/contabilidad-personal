/**
 * mockData.js — Datos semilla iniciales para Insumos, Pedidos y Contabilidad
 */

export const INITIAL_SUPPLIES = [
  {
    id: "INS-001",
    sku: "TEL-ALG-01",
    name: "Tela Algodón 100% Crudo",
    description: "Rollo de tela de algodón 100% hilado fino para confección textil.",
    category: "Telas",
    unit: "Metro",
    costPrice: 2800,
    salePrice: 4800,
    currentStock: 45,
    minStock: 50,
    criticalStock: 20,
    imageUrl: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-08T10:30:00Z"
  },
  {
    id: "INS-002",
    sku: "TEL-LIN-02",
    name: "Lino Rústico Premium",
    description: "Tejido de lino natural para tapicería y prendas sustentables.",
    category: "Telas",
    unit: "Metro",
    costPrice: 5200,
    salePrice: 8900,
    currentStock: 12,
    minStock: 25,
    criticalStock: 10,
    imageUrl: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-07T14:15:00Z"
  },
  {
    id: "INS-003",
    sku: "HIL-POL-01",
    name: "Bobina Hilo Poliéster 5000m",
    description: "Hilo de alta resistencia color Negro para costura recta e interlock.",
    category: "Hilos",
    unit: "Bobina",
    costPrice: 950,
    salePrice: 1800,
    currentStock: 80,
    minStock: 30,
    criticalStock: 15,
    imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-09T08:00:00Z"
  },
  {
    id: "INS-004",
    sku: "HIL-ELAS-02",
    name: "Hilo Elástico Tubular Blanco",
    description: "Bobina de elástico reforzado para pretinas y mangas.",
    category: "Hilos",
    unit: "Bobina",
    costPrice: 1200,
    salePrice: 2200,
    currentStock: 5,
    minStock: 20,
    criticalStock: 8,
    imageUrl: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-06T16:40:00Z"
  },
  {
    id: "INS-005",
    sku: "BOT-MAD-01",
    name: "Botón de Madera 4 Agujeros 20mm",
    description: "Pack x100 botones ecológicos de madera pulida natural.",
    category: "Botones & Avíos",
    unit: "Pack x100",
    costPrice: 1800,
    salePrice: 3400,
    currentStock: 0,
    minStock: 10,
    criticalStock: 5,
    imageUrl: "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-05T12:00:00Z"
  },
  {
    id: "INS-006",
    sku: "EMP-BOL-01",
    name: "Bolsa Kraft con Asa 25x35cm",
    description: "Pack x50 bolsas ecológicas para entrega de productos terminados.",
    category: "Empaques",
    unit: "Pack x50",
    costPrice: 2400,
    salePrice: 4200,
    currentStock: 65,
    minStock: 20,
    criticalStock: 10,
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-08T09:20:00Z"
  },
  {
    id: "INS-007",
    sku: "TIN-SER-01",
    name: "Tinta Textil Serigrafía Acrílica 1kg",
    description: "Tinta base agua color Azul Marino para estampados de alta durabilidad.",
    category: "Tintas & Químicos",
    unit: "Frasco 1kg",
    costPrice: 4100,
    salePrice: 6900,
    currentStock: 14,
    minStock: 15,
    criticalStock: 6,
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-07T18:00:00Z"
  },
  {
    id: "INS-008",
    sku: "CIE-MET-01",
    name: "Cierre Metálico N°5 Bronce 18cm",
    description: "Docena de cremalleras metálicas reforzadas para camperas y bolsos.",
    category: "Botones & Avíos",
    unit: "Docena",
    costPrice: 3100,
    salePrice: 5600,
    currentStock: 28,
    minStock: 15,
    criticalStock: 5,
    imageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600&auto=format&fit=crop&q=80",
    updatedAt: "2026-11-09T08:30:00Z"
  }
];

export const INITIAL_ORDERS = [
  {
    id: "PED-2026-001",
    orderNumber: 1001,
    date: "2026-11-07T11:20:00Z",
    customerName: "Taller Confecciones Del Sur",
    items: [
      {
        supplyId: "INS-001",
        name: "Tela Algodón 100% Crudo",
        quantity: 20,
        costPrice: 2800,
        salePrice: 4800,
        subtotal: 96000
      },
      {
        supplyId: "INS-003",
        name: "Bobina Hilo Poliéster 5000m",
        quantity: 6,
        costPrice: 950,
        salePrice: 1800,
        subtotal: 10800
      }
    ],
    totalCost: 61700,
    totalAmount: 106800,
    grossProfit: 45100,
    status: "completed",
    notes: "Entrega urgente en taller central."
  },
  {
    id: "PED-2026-002",
    orderNumber: 1002,
    date: "2026-11-08T15:45:00Z",
    customerName: "Boutique Artesanal Cordillera",
    items: [
      {
        supplyId: "INS-002",
        name: "Lino Rústico Premium",
        quantity: 15,
        costPrice: 5200,
        salePrice: 8900,
        subtotal: 133500
      },
      {
        supplyId: "INS-006",
        name: "Bolsa Kraft con Asa 25x35cm",
        quantity: 2,
        costPrice: 2400,
        salePrice: 4200,
        subtotal: 8400
      }
    ],
    totalCost: 82800,
    totalAmount: 141900,
    grossProfit: 59100,
    status: "completed",
    notes: "Pago recibido por transferencia bancaria."
  },
  {
    id: "PED-2026-003",
    orderNumber: 1003,
    date: "2026-11-09T08:15:00Z",
    customerName: "Diseños & Estampados Urbanos",
    items: [
      {
        supplyId: "INS-007",
        name: "Tinta Textil Serigrafía Acrílica 1kg",
        quantity: 4,
        costPrice: 4100,
        salePrice: 6900,
        subtotal: 27600
      }
    ],
    totalCost: 16400,
    totalAmount: 27600,
    grossProfit: 11200,
    status: "completed",
    notes: "Retiro en mostrador."
  }
];

export const INITIAL_ACCOUNTING = [
  {
    id: "TX-001",
    date: "2026-11-05T09:00:00Z",
    type: "expense",
    category: "restock",
    concept: "Compra Reposición Hilos y Tintas",
    amount: 85000,
    referenceId: "COMP-001",
    paymentMethod: "transfer"
  },
  {
    id: "TX-002",
    date: "2026-11-06T10:30:00Z",
    type: "expense",
    category: "operating_expense",
    concept: "Alquiler depósito y servicios de embalaje",
    amount: 45000,
    referenceId: null,
    paymentMethod: "transfer"
  },
  {
    id: "TX-003",
    date: "2026-11-07T11:20:00Z",
    type: "income",
    category: "sale",
    concept: "Cobro Pedido PED-2026-001 (Taller Confecciones Del Sur)",
    amount: 106800,
    referenceId: "PED-2026-001",
    paymentMethod: "transfer"
  },
  {
    id: "TX-004",
    date: "2026-11-08T15:45:00Z",
    type: "income",
    category: "sale",
    concept: "Cobro Pedido PED-2026-002 (Boutique Artesanal Cordillera)",
    amount: 141900,
    referenceId: "PED-2026-002",
    paymentMethod: "transfer"
  },
  {
    id: "TX-005",
    date: "2026-11-09T08:15:00Z",
    type: "income",
    category: "sale",
    concept: "Cobro Pedido PED-2026-003 (Diseños & Estampados Urbanos)",
    amount: 27600,
    referenceId: "PED-2026-003",
    paymentMethod: "cash"
  }
];
