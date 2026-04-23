import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportButton } from '@/components/ReportButton';
import { Lock, Package, CheckCircle2, Clock, DollarSign } from 'lucide-react';

const DELIVERED_NAMES = ['تم التسليم', 'تسليم جزئي'];
const REJECTED_NAMES = ['رفض ودفع شحن', 'استلم ودفع نص الشحن'];

export default function CourierClosures() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [selectedCourier, setSelectedCourier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [remainingOrders, setRemainingOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'courier');
      if (roles?.length) {
        const { data: ps } = await supabase.from('profiles').select('*').in('id', roles.map(r => r.user_id));
        setCouriers(ps || []);
        const map: Record<string, any> = {};
        (ps || []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCourier) {
      setClosedOrders([]); setRemainingOrders([]);
      return;
    }
    loadOrders();
  }, [selectedCourier, date]);

  const loadOrders = async () => {
    // Closed orders for the selected day (using updated_at as closure date)
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data: closed } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name)')
      .eq('courier_id', selectedCourier)
      .eq('is_courier_closed', true)
      .gte('updated_at', dayStart)
      .lte('updated_at', dayEnd)
      .order('updated_at', { ascending: false });

    // All remaining (not yet closed) orders for this courier
    const { data: remaining } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name)')
      .eq('courier_id', selectedCourier)
      .eq('is_courier_closed', false)
      .order('created_at', { ascending: false });

    setClosedOrders(closed || []);
    setRemainingOrders(remaining || []);
  };

  const courier = profiles[selectedCourier];
  const commissionRate = Number(courier?.commission_amount || 0);

  const getCollected = (o: any) => {
    const sname = o.order_statuses?.name;
    if (sname === 'تم التسليم') return Number(o.price || 0) + Number(o.delivery_price || 0);
    if (sname === 'تسليم جزئي') return Number(o.partial_amount || 0);
    if (REJECTED_NAMES.includes(sname)) return Number(o.shipping_paid || 0);
    return 0;
  };

  const closedStats = useMemo(() => {
    const totalCollected = closedOrders.reduce((s, o) => s + getCollected(o), 0);
    const commissionable = closedOrders.filter(o => {
      const sn = o.order_statuses?.name;
      return DELIVERED_NAMES.includes(sn) || REJECTED_NAMES.includes(sn);
    }).length;
    const totalCommission = commissionable * commissionRate;
    return {
      count: closedOrders.length,
      collected: totalCollected,
      commission: totalCommission,
      net: totalCollected - totalCommission,
    };
  }, [closedOrders, commissionRate]);

  const remainingStats = useMemo(() => {
    const collected = remainingOrders.reduce((s, o) => s + getCollected(o), 0);
    return { count: remainingOrders.length, collected };
  }, [remainingOrders]);

  const reportColumns = [
    { key: 'barcode', label: 'الباركود' },
    { key: 'customer_name', label: 'العميل' },
    { key: 'customer_phone', label: 'الهاتف' },
    { key: 'address', label: 'العنوان' },
    { key: 'office_name', label: 'المكتب', format: (_: any, r: any) => r.offices?.name || '-' },
    { key: 'price', label: 'سعر المنتج', format: (v: any) => `${Number(v || 0)} ج.م` },
    { key: 'delivery_price', label: 'الشحن', format: (v: any) => `${Number(v || 0)} ج.م` },
    { key: 'status', label: 'الحالة', format: (_: any, r: any) => r.order_statuses?.name || '-' },
    { key: 'collected', label: 'المحصل', format: (_: any, r: any) => `${getCollected(r)} ج.م` },
    { key: 'commission', label: 'عمولة المندوب', format: (_: any, r: any) => {
      const sn = r.order_statuses?.name;
      return (DELIVERED_NAMES.includes(sn) || REJECTED_NAMES.includes(sn)) ? `${commissionRate} ج.م` : '-';
    }},
    { key: 'closed_time', label: 'وقت التقفيل', format: (_: any, r: any) =>
      new Date(r.updated_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    },
  ];

  const nowStr = new Date().toLocaleString('ar-EG');

  const meta = {
    title: `تقفيلة المندوب — ${courier?.full_name || ''}`,
    subtitle: `يوم التقفيل: ${date} | عدد الأوردرات المقفلة: ${closedStats.count} | تم الإصدار: ${nowStr}`,
    filtersText: `المندوب: ${courier?.full_name || '-'} | الهاتف: ${courier?.phone || '-'} | اليوم: ${date}`,
    summary: [
      { label: '📦 أوردرات مقفلة اليوم', value: closedStats.count },
      { label: '💰 إجمالي المحصل', value: `${closedStats.collected.toLocaleString()} ج.م` },
      { label: `🎯 عمولة المندوب (${commissionRate} لكل أوردر)`, value: `${closedStats.commission.toLocaleString()} ج.م` },
      { label: '✅ صافي المستحق للشركة', value: `${closedStats.net.toLocaleString()} ج.م` },
      { label: '⏳ متبقي على المندوب (لم يتقفل)', value: `${remainingStats.count} أوردر` },
      { label: '💵 قيمة المتبقي', value: `${remainingStats.collected.toLocaleString()} ج.م` },
      { label: '🕒 تاريخ ووقت إصدار التقرير', value: nowStr },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          تقفيلة المناديب
        </h1>
        {selectedCourier && closedOrders.length > 0 && (
          <ReportButton
            meta={meta}
            columns={reportColumns}
            rows={closedOrders}
            whatsappPhone={courier?.phone}
            label="تصدير + واتساب"
          />
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">المندوب</Label>
            <Select value={selectedCourier} onValueChange={setSelectedCourier}>
              <SelectTrigger className="w-56 bg-secondary border-border">
                <SelectValue placeholder="اختر مندوب" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">يوم التقفيل</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-44 bg-secondary border-border" />
          </div>
          {courier && (
            <div className="text-sm text-muted-foreground self-end pb-2">
              {courier.phone && <>📱 <span dir="ltr" className="font-mono">{courier.phone}</span> | </>}
              عمولة: <span className="font-bold text-primary">{commissionRate} ج.م</span> / أوردر
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCourier && (
        <>
          {/* Closed Today Summary */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs text-emerald-700">مقفل اليوم</p>
                <p className="text-2xl font-bold text-emerald-700">{closedStats.count}</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-3 text-center">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-primary">إجمالي المحصل</p>
                <p className="text-lg font-bold text-primary">{closedStats.collected.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
            <Card className="bg-sky-50 border-sky-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-sky-700">عمولة المندوب</p>
                <p className="text-lg font-bold text-sky-700">{closedStats.commission.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-amber-700">صافي للشركة</p>
                <p className="text-lg font-bold text-amber-700">{closedStats.net.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
          </div>

          {/* Remaining Summary */}
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-rose-600" />
                <p className="text-sm text-rose-700">
                  متبقي على المندوب (لم يتم تقفيله): <span className="font-extrabold text-lg">{remainingStats.count}</span> أوردر
                </p>
              </div>
              <p className="text-sm text-rose-700">
                قيمتهم المحتملة: <span className="font-extrabold text-lg">{remainingStats.collected.toLocaleString()}</span> ج.م
              </p>
            </CardContent>
          </Card>

          {/* Closed Orders Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                الأوردرات المقفلة في {date}
                <Badge variant="secondary">{closedOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {closedOrders.length === 0 ? (
                <p className="text-center text-muted-foreground p-6">
                  لا توجد أوردرات مقفلة في هذا اليوم لهذا المندوب
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الباركود</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">المكتب</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">المحصل</TableHead>
                      <TableHead className="text-right">عمولة</TableHead>
                      <TableHead className="text-right">وقت التقفيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedOrders.map((o, i) => {
                      const sn = o.order_statuses?.name;
                      const isComm = DELIVERED_NAMES.includes(sn) || REJECTED_NAMES.includes(sn);
                      return (
                        <TableRow key={o.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{o.barcode || '-'}</TableCell>
                          <TableCell className="text-sm">{o.customer_name}</TableCell>
                          <TableCell className="text-sm" dir="ltr">{o.customer_phone || '-'}</TableCell>
                          <TableCell className="text-sm">{o.offices?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: (o.order_statuses?.color || '#888') + '30', color: o.order_statuses?.color }}>
                              {sn || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600">{getCollected(o)} ج.م</TableCell>
                          <TableCell className="font-bold text-sky-600">{isComm ? `${commissionRate} ج.م` : '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(o.updated_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
