export interface PandapeTenant {
  key: string;
  name: string;
  subdomain: string;
  category: 'TECH' | 'RETAIL' | 'HEALTH' | 'FINTECH' | 'FOOD' | 'SERVICES' | 'INDUSTRY';
  active: boolean;
  companyId?: number | null;
  description?: string;
}

/**
 * Curated registry of verified, active Brazilian corporate tenants on Pandapé (InfoJobs ATS).
 * Each tenant hosts a public career portal at https://{subdomain}.pandape.infojobs.com.br
 */
export const PANDAPE_BRAZIL_TENANTS: PandapeTenant[] = [
  {
    key: 'tobrasil',
    name: 'TO Brasil',
    subdomain: 'tobrasil',
    category: 'TECH',
    active: true,
    companyId: 3962,
    description: 'Consultoria e soluções em TI, ERP, Cloud e Analytics',
  },
  {
    key: 'stefanini',
    name: 'Stefanini Group',
    subdomain: 'stefanini',
    category: 'TECH',
    active: true,
    companyId: 2337,
    description: 'Multinacional brasileira de soluções em TI e transformação digital',
  },
  {
    key: 'hiring1',
    name: 'Hiring Soluções em RH',
    subdomain: 'hiring1',
    category: 'SERVICES',
    active: true,
    companyId: 3047,
    description: 'Consultoria especializada em recrutamento executivo e posições corporativas',
  },
  {
    key: 'dasa',
    name: 'Dasa Saúde',
    subdomain: 'dasa',
    category: 'HEALTH',
    active: true,
    companyId: 98,
    description: 'Maior rede de saúde integrada do Brasil (diagnósticos e hospitais)',
  },
  {
    key: 'stone',
    name: 'Stone Pagamentos',
    subdomain: 'stone',
    category: 'FINTECH',
    active: true,
    companyId: 242,
    description: 'Empresa de tecnologia financeira, pagamentos e banking',
  },
  {
    key: 'shopee',
    name: 'Shopee Brasil',
    subdomain: 'shopee',
    category: 'TECH',
    active: true,
    companyId: 10511,
    description: 'Plataforma líder em e-commerce e logística no Brasil',
  },
  {
    key: 'natura',
    name: 'Natura &Co',
    subdomain: 'natura',
    category: 'RETAIL',
    active: true,
    companyId: 8527,
    description: 'Multinacional brasileira de cosméticos e sustentabilidade',
  },
  {
    key: 'grupoboticario',
    name: 'Grupo Boticário',
    subdomain: 'grupoboticario',
    category: 'RETAIL',
    active: true,
    companyId: 5599,
    description: 'Grupo líder em cosméticos, perfumaria e canais digitais',
  },
  {
    key: 'ambev',
    name: 'Ambev',
    subdomain: 'ambev',
    category: 'INDUSTRY',
    active: true,
    companyId: 11654,
    description: 'Líder em bebidas, logística, inovação e centros de tecnologia',
  },
  {
    key: 'carrefour',
    name: 'Carrefour Brasil',
    subdomain: 'carrefour',
    category: 'RETAIL',
    active: true,
    companyId: 1604,
    description: 'Maior rede de varejo alimentar e hipermercados do Brasil',
  },
  {
    key: 'atacadao',
    name: 'Atacadão',
    subdomain: 'atacadao',
    category: 'RETAIL',
    active: true,
    companyId: 1606,
    description: 'Líder brasileiro no segmento de atacarejo e distribuição',
  },
  {
    key: 'americanas',
    name: 'Lojas Americanas',
    subdomain: 'americanas',
    category: 'RETAIL',
    active: true,
    companyId: 173,
    description: 'Rede brasileira de varejo físico e centros logísticos',
  },
  {
    key: 'centauro',
    name: 'Centauro / Grupo SBF',
    subdomain: 'centauro',
    category: 'RETAIL',
    active: true,
    companyId: 337,
    description: 'Maior rede de produtos esportivos e experiências da América Latina',
  },
  {
    key: 'riachuelo',
    name: 'Riachuelo',
    subdomain: 'riachuelo',
    category: 'RETAIL',
    active: true,
    companyId: 10391,
    description: 'Uma das maiores redes de moda, e-commerce e serviços financeiros do país',
  },
  {
    key: 'cea',
    name: 'C&A Brasil',
    subdomain: 'cea',
    category: 'RETAIL',
    active: true,
    description: 'Rede global de vestuário e canais digitais',
  },
  {
    key: 'kalunga',
    name: 'Kalunga',
    subdomain: 'kalunga',
    category: 'RETAIL',
    active: true,
    companyId: 1637,
    description: 'Líder em materiais de escritório, informática e papelaria',
  },
  {
    key: 'mcdonalds',
    name: 'Arcos Dorados (McDonald’s Brasil)',
    subdomain: 'mcdonalds',
    category: 'FOOD',
    active: true,
    companyId: 1944,
    description: 'Maior franquia independente da rede McDonald’s no mundo',
  },
  {
    key: 'zamp',
    name: 'ZAMP (BK & Popeyes)',
    subdomain: 'zamp',
    category: 'FOOD',
    active: true,
    companyId: 7920,
    description: 'Operadora das marcas Burger King e Popeyes no território nacional',
  },
  {
    key: 'habibs',
    name: 'Habib’s',
    subdomain: 'habibs',
    category: 'FOOD',
    active: true,
    companyId: 543,
    description: 'Uma das maiores redes de alimentação rápida e franquias do Brasil',
  },
  {
    key: 'outback',
    name: 'Outback Steakhouse',
    subdomain: 'outback',
    category: 'FOOD',
    active: true,
    description: 'Rede internacional de restaurantes casual dining no Brasil',
  },
  {
    key: 'pizzahut',
    name: 'Pizza Hut Brasil',
    subdomain: 'pizzahut',
    category: 'FOOD',
    active: true,
    companyId: 5884,
    description: 'Rede tradicional de pizzarias e franquias alimentícias',
  },
  {
    key: 'vivara',
    name: 'Vivara',
    subdomain: 'vivara',
    category: 'RETAIL',
    active: true,
    description: 'Maior joalheria do Brasil e marca premium de acessórios',
  },
  {
    key: 'cobasi',
    name: 'Cobasi',
    subdomain: 'cobasi',
    category: 'RETAIL',
    active: true,
    description: 'Pioneira no conceito de megalojas para cuidados animais e jardinagem',
  },
  {
    key: 'mobly',
    name: 'Mobly',
    subdomain: 'mobly',
    category: 'RETAIL',
    active: true,
    description: 'E-commerce e lojas de móveis, decoração e design',
  },
  {
    key: 'tokstok',
    name: 'Tok&Stok',
    subdomain: 'tokstok',
    category: 'RETAIL',
    active: true,
    description: 'Referência em móveis e soluções de design de interiores no Brasil',
  },
  {
    key: 'shein',
    name: 'Shein Brasil',
    subdomain: 'shein',
    category: 'RETAIL',
    active: true,
    companyId: 9917,
    description: 'Plataforma global de moda e marketplace digital no mercado brasileiro',
  },
  {
    key: 'termolar',
    name: 'Termolar',
    subdomain: 'termolar',
    category: 'INDUSTRY',
    active: true,
    companyId: 2506,
    description: 'Indústria tradicional gaúcha de soluções térmicas e bens de consumo',
  },
  {
    key: 'telhanorte',
    name: 'Telhanorte Tumelero',
    subdomain: 'telhanorte',
    category: 'RETAIL',
    active: true,
    description: 'Rede de materiais de construção e reformas',
  },
];

/**
 * Returns active tenants for parallel discovery.
 */
export function getActivePandapeTenants(): PandapeTenant[] {
  return PANDAPE_BRAZIL_TENANTS.filter((t) => t.active);
}

/**
 * Finds a tenant by its key or subdomain.
 */
export function getPandapeTenantByKey(key: string): PandapeTenant | undefined {
  const norm = (key || '').toLowerCase().trim();
  return PANDAPE_BRAZIL_TENANTS.find((t) => t.key.toLowerCase() === norm || t.subdomain.toLowerCase() === norm);
}
