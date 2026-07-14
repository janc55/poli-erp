'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  Package,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full';

interface Product {
  id: string;
  code?: string;
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  stock?: number;
  currentStock?: number;
  minStock?: number;
  salePrice?: number | string;
  price?: number | string;
  cost?: number | string;
  location?: string;
  active?: boolean;
  isActive?: boolean;
  batches?: Batch[];
  supplier?: { id: string; name: string };
  unit?: string;
  expiryDate?: string;
}
interface Batch {
  id?: string;
  batchNumber?: string;
  lotNumber?: string;
  quantity?: number;
  expiryDate?: string;
  expirationDate?: string;
  manufacturingDate?: string;
}
interface Movement {
  id?: string;
  type?: string;
  quantity?: number;
  reason?: string;
  reference?: string;
  createdAt?: string;
  product?: { name?: string };
}
interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  rnc?: string;
  address?: string;
  notes?: string;
  active?: boolean;
}

const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'] as const;

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return v;
}

function productName(p?: Product | null) {
  return p?.name ?? p?.description ?? '—';
}

function productStock(p: Product) {
  return num(p.stock ?? p.currentStock);
}

function productMinStock(p: Product) {
  return num(p.minStock);
}

function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className={cn('mt-10 w-full rounded-xl bg-white shadow-xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = useState<'products' | 'low' | 'expiring' | 'suppliers'>('products');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">Farmacia e inventario</p>
        </div>
        <button
          onClick={() => {
            const evt = new CustomEvent('open-movement');
            window.dispatchEvent(evt);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Truck className="h-4 w-4" />
          Registrar movimiento
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        {(
          [
            { k: 'products', l: 'Productos', icon: Package },
            { k: 'low', l: 'Stock bajo', icon: AlertTriangle },
            { k: 'expiring', l: 'Por vencer', icon: AlertTriangle },
            { k: 'suppliers', l: 'Proveedores', icon: Truck },
          ] as const
        ).map(({ k, l, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === k
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsTab />}
      {tab === 'low' && <LowStockTab />}
      {tab === 'expiring' && <ExpiringTab />}
      {tab === 'suppliers' && <SuppliersTab />}

      <GlobalMovementButton />
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.inventory.products({
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
      });
      setProducts((res.data ?? []) as Product[]);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(inputClass, 'sm:w-48')}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Buscar
          </button>
        </form>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Crear producto
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Mín.</th>
                <th className="px-4 py-3 text-right">P. venta</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Sin productos.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const active = p.active ?? p.isActive ?? true;
                  const low = productStock(p) <= productMinStock(p);
                  return (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {p.code ?? p.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{productName(p)}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            low ? 'text-red-600' : 'text-slate-900',
                          )}
                        >
                          {productStock(p)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {productMinStock(p)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatCurrency(num(p.salePrice ?? p.price))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        {active ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Sí
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewProduct(p)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductDetailModal product={viewProduct} onClose={() => setViewProduct(null)} />
      <NewProductModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}

function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);

  useEffect(() => {
    if (!product) return;
    setLoadingMov(true);
    api.inventory
      .movements(product.id)
      .then((res) => setMovements((res.data ?? []) as Movement[]))
      .catch(() => setMovements([]))
      .finally(() => setLoadingMov(false));
  }, [product]);

  if (!product) return null;
  return (
    <Modal open onClose={onClose} title={productName(product)} size="xl">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Código" value={product.code ?? product.sku} />
          <Field label="Categoría" value={product.category} />
          <Field label="Ubicación" value={product.location} />
          <Field label="Stock actual" value={`${productStock(product)} ${product.unit ?? ''}`} />
          <Field label="Stock mínimo" value={productMinStock(product)} />
          <Field label="Precio venta" value={formatCurrency(num(product.salePrice ?? product.price))} />
          <Field label="Costo" value={formatCurrency(num(product.cost))} />
          <Field label="Proveedor" value={product.supplier?.name} />
          <Field label="Activo" value={product.active ?? product.isActive ? 'Sí' : 'No'} />
        </div>

        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            Lotes
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Lote</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2">F. fabricación</th>
                <th className="px-3 py-2">F. vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {(product.batches ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                    Sin lotes registrados.
                  </td>
                </tr>
              ) : (
                product.batches!.map((b, i) => (
                  <tr key={b.id ?? i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{b.batchNumber ?? b.lotNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{b.quantity ?? '—'}</td>
                    <td className="px-3 py-2">{formatDate(b.manufacturingDate)}</td>
                    <td className="px-3 py-2">{formatDate(b.expiryDate ?? b.expirationDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            Últimos movimientos
          </div>
          {loadingMov ? (
            <p className="px-4 py-3 text-sm text-slate-500">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Sin movimientos.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {movements.slice(0, 10).map((m, i) => (
                <li key={m.id ?? i} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <span className="font-medium">{m.type}</span>
                    <span className="ml-2 text-slate-500">{m.reason ?? ''}</span>
                  </div>
                  <span className="text-slate-600">
                    {m.quantity} · {formatDate(m.createdAt, true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NewProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [cost, setCost] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCode('');
      setName('');
      setCategory('');
      setUnit('unidad');
      setStock('0');
      setMinStock('0');
      setSalePrice('');
      setCost('');
      setLocation('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.inventory.createProduct({
        code: code || undefined,
        name,
        category: category || undefined,
        unit,
        stock: parseInt(stock, 10) || 0,
        minStock: parseInt(minStock, 10) || 0,
        salePrice: parseFloat(salePrice) || 0,
        cost: parseFloat(cost) || 0,
        location: location || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Crear producto" size="lg">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Código</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Unidad</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Stock inicial</label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Stock mínimo</label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Precio venta</label>
          <input
            type="number"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Costo</label>
          <input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ubicación</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LowStockTab() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.inventory
      .lowStock()
      .then((res) => setItems((res.data ?? []) as Product[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Productos con stock bajo</h2>
        <p className="text-xs text-slate-500">
          Productos cuyo stock actual es igual o menor al mínimo configurado.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Sin alertas de stock bajo.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-slate-700">{p.code ?? p.sku ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{productName(p)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {productStock(p)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{productMinStock(p)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpiringTab() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const res = await api.inventory.expiring(days);
      setItems((res.data ?? []) as Product[]);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const batches = items.flatMap((p) =>
    (p.batches ?? []).map((b) => ({
      ...b,
      productId: p.id,
      productName: productName(p),
      productCode: p.code ?? p.sku,
    })),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700">Próximos</label>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className={cn(inputClass, 'w-32')}
        >
          <option value={7}>7 días</option>
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
          <option value={90}>90 días</option>
        </select>
        <span className="text-sm text-slate-500">a vencer</span>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Sin productos próximos a vencer.
                  </td>
                </tr>
              ) : (
                batches.map((b, i) => {
                  const exp = b.expiryDate ?? b.expirationDate;
                  const daysLeft = exp
                    ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000)
                    : null;
                  const color =
                    daysLeft !== null && daysLeft <= 7
                      ? 'text-red-600'
                      : daysLeft !== null && daysLeft <= 15
                        ? 'text-amber-600'
                        : 'text-slate-700';
                  return (
                    <tr key={`${b.productId}-${b.id ?? i}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{b.productName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{b.productCode ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {b.batchNumber ?? b.lotNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{b.quantity ?? '—'}</td>
                      <td className={cn('px-4 py-3 font-medium', color)}>
                        {formatDate(exp)}{' '}
                        {daysLeft !== null && (
                          <span className="text-xs text-slate-500">({daysLeft}d)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.inventory.suppliers();
      setSuppliers((res.data ?? []) as Supplier[]);
    } catch (e) {
      console.error(e);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setOpenNew(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Crear proveedor
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">RNC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Sin proveedores registrados.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-700">{s.contactName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{s.email ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.rnc ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewSupplierModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreated={() => {
          setOpenNew(false);
          load();
        }}
      />
    </div>
  );
}

function NewSupplierModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rnc, setRnc] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setRnc('');
      setAddress('');
      setNotes('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/inventory/suppliers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(typeof window !== 'undefined' && localStorage.getItem('accessToken')
              ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
              : {}),
          },
          body: JSON.stringify({
            name,
            contactName: contactName || undefined,
            phone: phone || undefined,
            email: email || undefined,
            rnc: rnc || undefined,
            address: address || undefined,
            notes: notes || undefined,
          }),
        },
      );
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) {
            msg = typeof body.message === 'string' ? body.message : body.message.join(', ');
          }
        } catch {}
        throw new Error(msg);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proveedor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Crear proveedor" size="md">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Contacto</label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">RNC</label>
          <input value={rnc} onChange={(e) => setRnc(e.target.value)} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GlobalMovementButton() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<(typeof MOVEMENT_TYPES)[number]>('IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-movement', handler);
    return () => window.removeEventListener('open-movement', handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setProductId('');
      setType('IN');
      setQuantity('1');
      setReason('');
      setReference('');
      setError('');
      return;
    }
    api.inventory
      .products()
      .then((res) => setProducts((res.data ?? []) as Product[]))
      .catch(() => setProducts([]));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      setError('Selecciona un producto');
      return;
    }
    const q = parseFloat(quantity);
    if (!q || q <= 0) {
      setError('Cantidad inválida');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.inventory.createMovement({
        productId,
        type,
        quantity: q,
        reason: reason || undefined,
        reference: reference || undefined,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar movimiento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Registrar movimiento de inventario" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Producto <span className="text-red-500">*</span>
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Selecciona...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ?? p.sku ? `${p.code ?? p.sku} · ` : ''}
                {productName(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof MOVEMENT_TYPES)[number])}
              className={inputClass}
            >
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="RETURN">Devolución</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
            placeholder="Ej.Compra, Venta, Merma..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Referencia</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputClass}
            placeholder="Ej. #factura, orden de compra..."
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value ?? '—'}</p>
    </div>
  );
}